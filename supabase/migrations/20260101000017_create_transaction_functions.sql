-- ============================================================
-- fn_record_delivery
-- Called when materials are delivered against a purchase order.
-- Atomically: creates delivery + items, updates PO item quantities,
-- upserts project inventory, logs movements, records costs,
-- and updates PO status.
-- ============================================================
CREATE OR REPLACE FUNCTION construction.fn_record_delivery(
  p_purchase_order_id UUID,
  p_received_by UUID,
  p_items JSONB,  -- [{po_item_id, material_id, quantity_received, unit_cost}]
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = construction
AS $$
DECLARE
  v_delivery_id UUID;
  v_item JSONB;
  v_project_id UUID;
  v_company_id UUID;
  v_all_delivered BOOLEAN;
BEGIN
  -- Get project_id and company_id from the purchase order (lock row to prevent concurrent deliveries)
  SELECT po.project_id, p.company_id
  INTO STRICT v_project_id, v_company_id
  FROM purchase_orders po
  JOIN projects p ON p.id = po.project_id
  WHERE po.id = p_purchase_order_id
  FOR UPDATE OF po;

  -- Authorization: verify the user belongs to this company
  PERFORM 1 FROM company_members
  WHERE user_id = p_received_by
    AND company_id = v_company_id
    AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized: user does not belong to this company';
  END IF;

  -- 1. Create delivery record
  INSERT INTO deliveries (purchase_order_id, delivery_date, received_by, notes)
  VALUES (p_purchase_order_id, CURRENT_DATE, p_received_by, p_notes)
  RETURNING id INTO v_delivery_id;

  -- 2. Process each delivered item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- 2a. Insert delivery line item
    INSERT INTO delivery_items (delivery_id, po_item_id, quantity_received)
    VALUES (
      v_delivery_id,
      (v_item->>'po_item_id')::UUID,
      (v_item->>'quantity_received')::NUMERIC
    );

    -- 2b. Update PO item delivered quantity
    UPDATE po_items
    SET quantity_delivered = quantity_delivered + (v_item->>'quantity_received')::NUMERIC
    WHERE id = (v_item->>'po_item_id')::UUID;

    -- 2c. Upsert project inventory (add stock)
    INSERT INTO project_inventory (project_id, material_id, quantity, last_updated)
    VALUES (
      v_project_id,
      (v_item->>'material_id')::UUID,
      (v_item->>'quantity_received')::NUMERIC,
      now()
    )
    ON CONFLICT (project_id, material_id)
    DO UPDATE SET
      quantity = project_inventory.quantity + (v_item->>'quantity_received')::NUMERIC,
      last_updated = now();

    -- 2d. Insert inventory log
    INSERT INTO inventory_logs (project_id, material_id, type, quantity, reference_type, reference_id, performed_by)
    VALUES (
      v_project_id,
      (v_item->>'material_id')::UUID,
      'in',
      (v_item->>'quantity_received')::NUMERIC,
      'purchase_order',
      p_purchase_order_id,
      p_received_by
    );

    -- 2e. Record material cost
    INSERT INTO project_costs (project_id, category, description, amount, reference_type, reference_id, recorded_by)
    VALUES (
      v_project_id,
      'materials',
      'Delivery from PO',
      (v_item->>'quantity_received')::NUMERIC * (v_item->>'unit_cost')::NUMERIC,
      'purchase_order',
      p_purchase_order_id,
      p_received_by
    );
  END LOOP;

  -- 3. Check if all PO items are fully delivered → update PO status
  SELECT NOT EXISTS (
    SELECT 1 FROM po_items
    WHERE purchase_order_id = p_purchase_order_id
      AND quantity_delivered < quantity
  ) INTO v_all_delivered;

  UPDATE purchase_orders
  SET status = CASE WHEN v_all_delivered THEN 'delivered' ELSE 'partially_delivered' END,
      updated_at = now()
  WHERE id = p_purchase_order_id;

  RETURN v_delivery_id;
END;
$$;


-- ============================================================
-- fn_reserve_stock
-- Reserves materials for a specific task/phase.
-- Validates available stock before reserving.
-- ============================================================
CREATE OR REPLACE FUNCTION construction.fn_reserve_stock(
  p_project_id UUID,
  p_material_id UUID,
  p_quantity NUMERIC,
  p_purpose TEXT,
  p_reserved_by UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = construction
AS $$
DECLARE
  v_reservation_id UUID;
  v_available NUMERIC;
  v_company_id UUID;
BEGIN
  -- Authorization: verify the user belongs to this project's company
  SELECT p.company_id INTO STRICT v_company_id
  FROM projects p
  WHERE p.id = p_project_id;

  PERFORM 1 FROM company_members
  WHERE user_id = p_reserved_by
    AND company_id = v_company_id
    AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized: user does not belong to this company';
  END IF;

  -- Check available stock (lock row to prevent concurrent reservation races)
  SELECT COALESCE(quantity - reserved, 0) INTO v_available
  FROM project_inventory
  WHERE project_id = p_project_id AND material_id = p_material_id
  FOR UPDATE;

  IF v_available IS NULL OR v_available < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock. Available: %, Requested: %', COALESCE(v_available, 0), p_quantity;
  END IF;

  -- 1. Create reservation
  INSERT INTO stock_reservations (project_id, material_id, quantity, purpose, status, reserved_by)
  VALUES (p_project_id, p_material_id, p_quantity, p_purpose, 'active', p_reserved_by)
  RETURNING id INTO v_reservation_id;

  -- 2. Update reserved quantity
  UPDATE project_inventory
  SET reserved = reserved + p_quantity,
      last_updated = now()
  WHERE project_id = p_project_id AND material_id = p_material_id;

  -- 3. Log the reservation
  INSERT INTO inventory_logs (project_id, material_id, type, quantity, reference_type, reference_id, performed_by)
  VALUES (p_project_id, p_material_id, 'reservation', p_quantity, 'manual', v_reservation_id, p_reserved_by);

  RETURN v_reservation_id;
END;
$$;


-- ============================================================
-- fn_fulfill_reservation
-- Fulfills a stock reservation (materials used).
-- Deducts from both quantity and reserved.
-- ============================================================
CREATE OR REPLACE FUNCTION construction.fn_fulfill_reservation(
  p_reservation_id UUID,
  p_performed_by UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = construction
AS $$
DECLARE
  v_project_id UUID;
  v_material_id UUID;
  v_quantity NUMERIC;
  v_status TEXT;
  v_company_id UUID;
BEGIN
  -- Get reservation details (lock to prevent concurrent fulfill/cancel)
  SELECT project_id, material_id, quantity, status
  INTO STRICT v_project_id, v_material_id, v_quantity, v_status
  FROM stock_reservations
  WHERE id = p_reservation_id
  FOR UPDATE;

  IF v_status != 'active' THEN
    RAISE EXCEPTION 'Reservation is not active. Current status: %', v_status;
  END IF;

  -- Authorization: verify the user belongs to this project's company
  SELECT p.company_id INTO STRICT v_company_id
  FROM projects p WHERE p.id = v_project_id;

  PERFORM 1 FROM company_members
  WHERE user_id = p_performed_by
    AND company_id = v_company_id
    AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized: user does not belong to this company';
  END IF;

  -- 1. Mark reservation as fulfilled
  UPDATE stock_reservations
  SET status = 'fulfilled', fulfilled_at = now()
  WHERE id = p_reservation_id;

  -- 2. Deduct from inventory (lock row, then deduct both quantity and reserved)
  UPDATE project_inventory
  SET quantity = quantity - v_quantity,
      reserved = reserved - v_quantity,
      last_updated = now()
  WHERE project_id = v_project_id AND material_id = v_material_id;

  -- 3. Log the outgoing movement
  INSERT INTO inventory_logs (project_id, material_id, type, quantity, reference_type, reference_id, performed_by)
  VALUES (v_project_id, v_material_id, 'out', -v_quantity, 'manual', p_reservation_id, p_performed_by);
END;
$$;


-- ============================================================
-- fn_complete_transfer
-- Completes an approved inventory transfer between projects.
-- Validates source has enough stock, moves inventory, logs both sides.
-- ============================================================
CREATE OR REPLACE FUNCTION construction.fn_complete_transfer(
  p_transfer_id UUID,
  p_approved_by UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = construction
AS $$
DECLARE
  v_from_project UUID;
  v_to_project UUID;
  v_material_id UUID;
  v_quantity NUMERIC;
  v_available NUMERIC;
  v_status TEXT;
  v_company_id UUID;
BEGIN
  -- Get transfer details (lock to prevent concurrent approval)
  SELECT from_project_id, to_project_id, material_id, quantity, status
  INTO STRICT v_from_project, v_to_project, v_material_id, v_quantity, v_status
  FROM inventory_transfers
  WHERE id = p_transfer_id
  FOR UPDATE;

  IF v_status != 'pending' THEN
    RAISE EXCEPTION 'Transfer is not pending. Current status: %', v_status;
  END IF;

  -- Authorization: verify the user belongs to this project's company
  SELECT p.company_id INTO STRICT v_company_id
  FROM projects p WHERE p.id = v_from_project;

  PERFORM 1 FROM company_members
  WHERE user_id = p_approved_by
    AND company_id = v_company_id
    AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized: user does not belong to this company';
  END IF;

  -- Validate source has sufficient stock (lock inventory row to prevent concurrent deductions)
  SELECT COALESCE(quantity - reserved, 0) INTO v_available
  FROM project_inventory
  WHERE project_id = v_from_project AND material_id = v_material_id
  FOR UPDATE;

  IF v_available IS NULL OR v_available < v_quantity THEN
    RAISE EXCEPTION 'Insufficient stock in source project. Available: %, Requested: %', COALESCE(v_available, 0), v_quantity;
  END IF;

  -- 1. Update transfer status
  UPDATE inventory_transfers
  SET status = 'completed',
      approved_by = p_approved_by,
      completed_at = now()
  WHERE id = p_transfer_id;

  -- 2. Deduct from source project
  UPDATE project_inventory
  SET quantity = quantity - v_quantity,
      last_updated = now()
  WHERE project_id = v_from_project AND material_id = v_material_id;

  -- 3. Add to destination project (upsert)
  INSERT INTO project_inventory (project_id, material_id, quantity, last_updated)
  VALUES (v_to_project, v_material_id, v_quantity, now())
  ON CONFLICT (project_id, material_id)
  DO UPDATE SET
    quantity = project_inventory.quantity + v_quantity,
    last_updated = now();

  -- 4. Log transfer_out on source
  INSERT INTO inventory_logs (project_id, material_id, type, quantity, reference_type, reference_id, performed_by)
  VALUES (v_from_project, v_material_id, 'transfer_out', -v_quantity, 'transfer', p_transfer_id, p_approved_by);

  -- 5. Log transfer_in on destination
  INSERT INTO inventory_logs (project_id, material_id, type, quantity, reference_type, reference_id, performed_by)
  VALUES (v_to_project, v_material_id, 'transfer_in', v_quantity, 'transfer', p_transfer_id, p_approved_by);
END;
$$;


-- ============================================================
-- fn_report_waste
-- Records material waste and deducts from inventory atomically.
-- ============================================================
CREATE OR REPLACE FUNCTION construction.fn_report_waste(
  p_project_id UUID,
  p_material_id UUID,
  p_quantity NUMERIC,
  p_waste_reason TEXT,   -- 'damaged', 'expired', 'spillage', 'theft', 'other'
  p_performed_by UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = construction
AS $$
DECLARE
  v_log_id UUID;
  v_available NUMERIC;
  v_company_id UUID;
BEGIN
  -- Authorization: verify the user belongs to this project's company
  SELECT p.company_id INTO STRICT v_company_id
  FROM projects p WHERE p.id = p_project_id;

  PERFORM 1 FROM company_members
  WHERE user_id = p_performed_by
    AND company_id = v_company_id
    AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized: user does not belong to this company';
  END IF;

  -- Validate stock exists (lock row to prevent concurrent waste/deduction race)
  SELECT COALESCE(quantity - reserved, 0) INTO v_available
  FROM project_inventory
  WHERE project_id = p_project_id AND material_id = p_material_id
  FOR UPDATE;

  IF v_available IS NULL OR v_available < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock to report waste. Available: %, Waste amount: %', COALESCE(v_available, 0), p_quantity;
  END IF;

  -- 1. Deduct from inventory
  UPDATE project_inventory
  SET quantity = quantity - p_quantity,
      last_updated = now()
  WHERE project_id = p_project_id AND material_id = p_material_id;

  -- 2. Log the waste
  INSERT INTO inventory_logs (project_id, material_id, type, quantity, waste_reason, notes, performed_by)
  VALUES (p_project_id, p_material_id, 'waste', -p_quantity, p_waste_reason, p_notes, p_performed_by)
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;


-- ============================================================
-- fn_cancel_reservation
-- Cancels an active reservation and releases the reserved quantity.
-- ============================================================
CREATE OR REPLACE FUNCTION construction.fn_cancel_reservation(
  p_reservation_id UUID,
  p_performed_by UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = construction
AS $$
DECLARE
  v_project_id UUID;
  v_material_id UUID;
  v_quantity NUMERIC;
  v_status TEXT;
BEGIN
  -- Lock reservation row to prevent concurrent cancel/fulfill
  SELECT project_id, material_id, quantity, status
  INTO STRICT v_project_id, v_material_id, v_quantity, v_status
  FROM stock_reservations
  WHERE id = p_reservation_id
  FOR UPDATE;

  IF v_status != 'active' THEN
    RAISE EXCEPTION 'Reservation is not active. Current status: %', v_status;
  END IF;

  -- Authorization: verify the user belongs to this project's company
  PERFORM 1 FROM company_members cm
  JOIN projects p ON p.company_id = cm.company_id
  WHERE cm.user_id = p_performed_by
    AND p.id = v_project_id
    AND cm.is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized: user does not belong to this company';
  END IF;

  -- 1. Cancel reservation
  UPDATE stock_reservations
  SET status = 'cancelled'
  WHERE id = p_reservation_id;

  -- 2. Release reserved quantity
  UPDATE project_inventory
  SET reserved = reserved - v_quantity,
      last_updated = now()
  WHERE project_id = v_project_id AND material_id = v_material_id;

  -- 3. Log the release
  INSERT INTO inventory_logs (project_id, material_id, type, quantity, reference_type, reference_id, performed_by)
  VALUES (v_project_id, v_material_id, 'release', v_quantity, 'manual', p_reservation_id, p_performed_by);
END;
$$;
