/**
 * TypeScript types for the construction schema database.
 * Generated from supabase/migrations/20260101000000–20260101000017.
 *
 * These types mirror the Supabase-generated output shape:
 *   Database["construction"]["Tables"]["table_name"]["Row" | "Insert" | "Update"]
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ---------------------------------------------------------------------------
// Enum-like string literals derived from CHECK constraints
// ---------------------------------------------------------------------------

export type CompanyPlan = 'starter' | 'professional' | 'business' | 'enterprise'
export type CompanyPlanStatus = 'trial' | 'active' | 'past_due' | 'cancelled'

export type MemberRole =
  | 'owner'
  | 'admin'
  | 'project_manager'
  | 'accountant'
  | 'procurement_officer'
  | 'staff'

export type InvitationRole = Exclude<MemberRole, 'owner'>

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'cancelled'

export type ProjectStatus =
  | 'planning'
  | 'active'
  | 'on_hold'
  | 'completed'
  | 'cancelled'

export type ProjectMemberRole = 'project_manager' | 'engineer' | 'foreman' | 'member'

export type MaterialUnit =
  | 'pcs'
  | 'bags'
  | 'kg'
  | 'tons'
  | 'liters'
  | 'gallons'
  | 'meters'
  | 'feet'
  | 'sq_m'
  | 'sq_ft'
  | 'cu_m'
  | 'cu_ft'
  | 'rolls'
  | 'sheets'
  | 'boxes'
  | 'sets'

export type InventoryLogType =
  | 'in'
  | 'out'
  | 'transfer_in'
  | 'transfer_out'
  | 'adjustment'
  | 'waste'
  | 'reservation'
  | 'release'

export type ReservationStatus = 'active' | 'fulfilled' | 'cancelled'

export type TransferStatus = 'pending' | 'approved' | 'completed' | 'rejected'

export type PurchaseOrderStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'ordered'
  | 'partially_delivered'
  | 'delivered'
  | 'cancelled'

export type EmployeeType = 'salaried' | 'daily_wage' | 'contract'

export type EmployeeStatus = 'active' | 'inactive' | 'terminated'

export type AttendanceStatus =
  | 'present'
  | 'absent'
  | 'half_day'
  | 'overtime'
  | 'leave'

export type CashAdvanceStatus =
  | 'pending'
  | 'approved'
  | 'paid_out'
  | 'fully_deducted'
  | 'rejected'

export type LoanType =
  | 'sss_salary'
  | 'sss_calamity'
  | 'pagibig_mpl'
  | 'pagibig_calamity'
  | 'company'

export type LoanStatus = 'active' | 'fully_paid' | 'defaulted'

export type PayrollPayType = 'weekly' | 'semi_monthly' | 'monthly'

export type PayrollStatus = 'draft' | 'computed' | 'approved' | 'paid'

export type ProjectCostCategory = 'materials' | 'labor' | 'equipment'

export type ExpenseCategory =
  | 'materials'
  | 'labor'
  | 'equipment'
  | 'transport'
  | 'permits'
  | 'utilities'
  | 'subcontractor'
  | 'misc'

export type ExpenseStatus = 'pending' | 'approved' | 'rejected'

export type EquipmentStatus = 'available' | 'in_use' | 'maintenance' | 'retired'

export type DocumentType =
  | 'blueprint'
  | 'permit'
  | 'contract'
  | 'report'
  | 'photo'
  | 'invoice'
  | 'receipt'
  | 'other'

export type NotificationType = 'info' | 'warning' | 'success' | 'error'

export type SubscriptionStatus = 'pending' | 'paid' | 'past_due' | 'cancelled'

// ---------------------------------------------------------------------------
// Row types (what you get back from SELECT)
// ---------------------------------------------------------------------------

export interface Profile {
  id: string
  email: string
  full_name: string
  avatar_url: string | null
  phone: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Company {
  id: string
  name: string
  slug: string
  owner_id: string
  address: string | null
  contact_phone: string | null
  contact_email: string | null
  tin: string | null
  plan: CompanyPlan
  plan_status: CompanyPlanStatus
  trial_ends_at: string | null
  current_period_start: string | null
  current_period_end: string | null
  max_projects: number
  max_employees: number
  max_users: number
  created_at: string
  updated_at: string
}

export interface CompanyMember {
  id: string
  company_id: string
  user_id: string
  role: MemberRole
  is_active: boolean
  joined_at: string
  created_at: string
  updated_at: string
}

export interface CompanyInvitation {
  id: string
  company_id: string
  invited_email: string
  role: InvitationRole
  token: string
  invited_by: string
  status: InvitationStatus
  expires_at: string
  accepted_at: string | null
  created_at: string
}

export interface Project {
  id: string
  company_id: string
  name: string
  description: string | null
  location: string | null
  client_name: string | null
  client_contact: string | null
  status: ProjectStatus
  start_date: string | null
  target_end_date: string | null
  actual_end_date: string | null
  budget: number | null
  progress: number
  created_by: string
  created_at: string
  updated_at: string
}

export interface ProjectMember {
  id: string
  project_id: string
  employee_id: string | null
  role: ProjectMemberRole
  assigned_at: string
  removed_at: string | null
}

export interface Material {
  id: string
  company_id: string
  name: string
  description: string | null
  unit: MaterialUnit
  category: string | null
  unit_cost: number | null
  sku: string | null
  min_stock: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ProjectInventory {
  id: string
  project_id: string
  material_id: string
  quantity: number
  reserved: number
  last_updated: string
}

export interface InventoryLog {
  id: string
  project_id: string
  material_id: string
  type: InventoryLogType
  quantity: number
  reference_type: string | null
  reference_id: string | null
  waste_reason: string | null
  notes: string | null
  performed_by: string
  created_at: string
}

export interface StockReservation {
  id: string
  project_id: string
  material_id: string
  quantity: number
  purpose: string
  status: ReservationStatus
  reserved_by: string
  fulfilled_at: string | null
  created_at: string
}

export interface InventoryTransfer {
  id: string
  company_id: string
  from_project_id: string
  to_project_id: string
  material_id: string
  quantity: number
  status: TransferStatus
  notes: string | null
  requested_by: string
  approved_by: string | null
  completed_at: string | null
  created_at: string
}

export interface Supplier {
  id: string
  company_id: string
  name: string
  contact_person: string | null
  email: string | null
  phone: string | null
  address: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PurchaseOrder {
  id: string
  company_id: string
  po_number: string
  project_id: string
  supplier_id: string
  status: PurchaseOrderStatus
  total_amount: number
  notes: string | null
  requested_by: string
  approved_by: string | null
  approved_at: string | null
  order_date: string | null
  expected_delivery: string | null
  created_at: string
  updated_at: string
}

export interface PoItem {
  id: string
  purchase_order_id: string
  material_id: string
  quantity: number
  unit_cost: number
  total_cost: number // GENERATED
  quantity_delivered: number
  created_at: string
}

export interface Delivery {
  id: string
  purchase_order_id: string
  delivery_date: string
  received_by: string
  notes: string | null
  created_at: string
}

export interface DeliveryItem {
  id: string
  delivery_id: string
  po_item_id: string
  quantity_received: number
  created_at: string
}

export interface Employee {
  id: string
  company_id: string
  profile_id: string | null
  first_name: string
  last_name: string
  employee_type: EmployeeType
  job_title: string
  daily_rate: number | null
  monthly_salary: number | null
  sss_number: string | null
  philhealth_number: string | null
  pagibig_number: string | null
  tin: string | null
  contact_phone: string | null
  emergency_contact: string | null
  date_hired: string
  date_terminated: string | null
  status: EmployeeStatus
  created_at: string
  updated_at: string
}

export interface Attendance {
  id: string
  employee_id: string
  project_id: string | null
  date: string
  status: AttendanceStatus
  hours_worked: number | null
  overtime_hours: number | null
  notes: string | null
  recorded_by: string
  created_at: string
}

export interface CashAdvance {
  id: string
  company_id: string
  employee_id: string
  amount: number
  remaining_balance: number
  reason: string | null
  status: CashAdvanceStatus
  approved_by: string | null
  date_granted: string | null
  created_at: string
}

export interface EmployeeLoan {
  id: string
  company_id: string
  employee_id: string
  loan_type: LoanType
  principal: number
  remaining_balance: number
  monthly_amortization: number
  start_date: string
  end_date: string | null
  status: LoanStatus
  created_at: string
}

export interface Payroll {
  id: string
  company_id: string
  period_start: string
  period_end: string
  pay_type: PayrollPayType
  status: PayrollStatus
  total_amount: number
  processed_by: string | null
  approved_by: string | null
  created_at: string
  updated_at: string
}

export interface PayrollItem {
  id: string
  payroll_id: string
  employee_id: string
  days_worked: number
  overtime_hours: number
  base_pay: number
  overtime_pay: number
  sss_ee: number
  sss_er: number
  philhealth_ee: number
  philhealth_er: number
  pagibig_ee: number
  pagibig_er: number
  withholding_tax: number
  cash_advance_deduction: number
  loan_deduction: number
  other_deductions: number
  allowances: number
  bonuses: number
  total_deductions: number // GENERATED
  gross_pay: number // GENERATED
  net_pay: number // GENERATED
  deduction_notes: string | null
  bonus_notes: string | null
  created_at: string
}

export interface ProjectCost {
  id: string
  project_id: string
  category: ProjectCostCategory
  description: string
  amount: number
  date: string
  reference_type: string | null
  reference_id: string | null
  recorded_by: string
  created_at: string
}

export interface Expense {
  id: string
  company_id: string
  project_id: string | null
  category: ExpenseCategory
  description: string
  amount: number
  date: string
  receipt_url: string | null
  submitted_by: string
  approved_by: string | null
  status: ExpenseStatus
  created_at: string
}

export interface Equipment {
  id: string
  company_id: string
  name: string
  type: string | null
  serial_number: string | null
  status: EquipmentStatus
  purchase_date: string | null
  purchase_cost: number | null
  daily_rate: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface EquipmentAssignment {
  id: string
  equipment_id: string
  project_id: string
  assigned_date: string
  returned_date: string | null
  assigned_by: string
  notes: string | null
  created_at: string
}

export interface Document {
  id: string
  company_id: string
  project_id: string | null
  name: string
  type: DocumentType
  file_path: string
  file_size: number | null
  uploaded_by: string
  created_at: string
}

export interface Notification {
  id: string
  company_id: string
  user_id: string
  title: string
  message: string
  type: NotificationType
  link: string | null
  is_read: boolean
  created_at: string
}

export interface AuditLog {
  id: string
  company_id: string
  user_id: string | null
  action: string
  table_name: string
  record_id: string | null
  old_data: Json | null
  new_data: Json | null
  ip_address: string | null
  created_at: string
}

export interface Subscription {
  id: string
  company_id: string
  plan: string
  amount: number
  period_start: string
  period_end: string
  status: SubscriptionStatus
  payment_method: string | null
  payment_reference: string | null
  paid_at: string | null
  created_at: string
}

// ---------------------------------------------------------------------------
// View types
// ---------------------------------------------------------------------------

export interface ProjectCostSummary {
  project_id: string
  project_name: string
  budget: number | null
  materials_cost: number
  labor_cost: number
  equipment_cost: number
  total_cost: number
  remaining_budget: number | null
}

// ---------------------------------------------------------------------------
// Database shape (mirrors supabase gen types output)
// ---------------------------------------------------------------------------

export interface Database {
  construction: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at' | 'is_active'> & {
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Profile, 'id'>>
      }
      companies: {
        Row: Company
        Insert: Pick<Company, 'name' | 'slug' | 'owner_id'> & Partial<Omit<Company, 'id' | 'name' | 'slug' | 'owner_id' | 'created_at' | 'updated_at'>> & {
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Company, 'id'>>
      }
      company_members: {
        Row: CompanyMember
        Insert: Pick<CompanyMember, 'company_id' | 'user_id'> & Partial<Omit<CompanyMember, 'id' | 'company_id' | 'user_id' | 'created_at' | 'updated_at' | 'joined_at'>> & {
          created_at?: string
          updated_at?: string
          joined_at?: string
        }
        Update: Partial<Omit<CompanyMember, 'id'>>
      }
      company_invitations: {
        Row: CompanyInvitation
        Insert: Pick<CompanyInvitation, 'company_id' | 'invited_email' | 'invited_by'> & Partial<Omit<CompanyInvitation, 'id' | 'company_id' | 'invited_email' | 'invited_by' | 'created_at' | 'token'>> & {
          created_at?: string
          token?: string
        }
        Update: Partial<Omit<CompanyInvitation, 'id'>>
      }
      projects: {
        Row: Project
        Insert: Pick<Project, 'company_id' | 'name' | 'created_by'> & Partial<Omit<Project, 'id' | 'company_id' | 'name' | 'created_by' | 'created_at' | 'updated_at' | 'progress'>> & {
          progress?: number
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Project, 'id'>>
      }
      project_members: {
        Row: ProjectMember
        Insert: Pick<ProjectMember, 'project_id'> & Partial<Omit<ProjectMember, 'id' | 'project_id' | 'assigned_at'>> & {
          assigned_at?: string
        }
        Update: Partial<Omit<ProjectMember, 'id'>>
      }
      materials: {
        Row: Material
        Insert: Pick<Material, 'company_id' | 'name' | 'unit'> & Partial<Omit<Material, 'id' | 'company_id' | 'name' | 'unit' | 'created_at' | 'updated_at' | 'is_active' | 'min_stock'>> & {
          is_active?: boolean
          min_stock?: number
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Material, 'id'>>
      }
      project_inventory: {
        Row: ProjectInventory
        Insert: Pick<ProjectInventory, 'project_id' | 'material_id'> & Partial<Omit<ProjectInventory, 'id' | 'project_id' | 'material_id' | 'last_updated' | 'quantity' | 'reserved'>> & {
          quantity?: number
          reserved?: number
          last_updated?: string
        }
        Update: Partial<Omit<ProjectInventory, 'id'>>
      }
      inventory_logs: {
        Row: InventoryLog
        Insert: Pick<InventoryLog, 'project_id' | 'material_id' | 'type' | 'quantity' | 'performed_by'> & Partial<Omit<InventoryLog, 'id' | 'project_id' | 'material_id' | 'type' | 'quantity' | 'performed_by' | 'created_at'>> & {
          created_at?: string
        }
        Update: Partial<Omit<InventoryLog, 'id'>>
      }
      stock_reservations: {
        Row: StockReservation
        Insert: Pick<StockReservation, 'project_id' | 'material_id' | 'quantity' | 'purpose' | 'reserved_by'> & Partial<Omit<StockReservation, 'id' | 'project_id' | 'material_id' | 'quantity' | 'purpose' | 'reserved_by' | 'created_at' | 'status'>> & {
          status?: ReservationStatus
          created_at?: string
        }
        Update: Partial<Omit<StockReservation, 'id'>>
      }
      inventory_transfers: {
        Row: InventoryTransfer
        Insert: Pick<InventoryTransfer, 'company_id' | 'from_project_id' | 'to_project_id' | 'material_id' | 'quantity' | 'requested_by'> & Partial<Omit<InventoryTransfer, 'id' | 'company_id' | 'from_project_id' | 'to_project_id' | 'material_id' | 'quantity' | 'requested_by' | 'created_at' | 'status'>> & {
          status?: TransferStatus
          created_at?: string
        }
        Update: Partial<Omit<InventoryTransfer, 'id'>>
      }
      suppliers: {
        Row: Supplier
        Insert: Pick<Supplier, 'company_id' | 'name'> & Partial<Omit<Supplier, 'id' | 'company_id' | 'name' | 'created_at' | 'updated_at' | 'is_active'>> & {
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Supplier, 'id'>>
      }
      purchase_orders: {
        Row: PurchaseOrder
        Insert: Pick<PurchaseOrder, 'company_id' | 'project_id' | 'supplier_id' | 'requested_by'> & Partial<Omit<PurchaseOrder, 'id' | 'company_id' | 'project_id' | 'supplier_id' | 'requested_by' | 'created_at' | 'updated_at' | 'status' | 'total_amount' | 'po_number'>> & {
          po_number?: string
          status?: PurchaseOrderStatus
          total_amount?: number
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<PurchaseOrder, 'id'>>
      }
      po_items: {
        Row: PoItem
        Insert: Pick<PoItem, 'purchase_order_id' | 'material_id' | 'quantity' | 'unit_cost'> & Partial<Omit<PoItem, 'id' | 'purchase_order_id' | 'material_id' | 'quantity' | 'unit_cost' | 'total_cost' | 'created_at' | 'quantity_delivered'>> & {
          quantity_delivered?: number
          created_at?: string
        }
        Update: Partial<Omit<PoItem, 'id' | 'total_cost'>>
      }
      deliveries: {
        Row: Delivery
        Insert: Pick<Delivery, 'purchase_order_id' | 'received_by'> & Partial<Omit<Delivery, 'id' | 'purchase_order_id' | 'received_by' | 'created_at' | 'delivery_date'>> & {
          delivery_date?: string
          created_at?: string
        }
        Update: Partial<Omit<Delivery, 'id'>>
      }
      delivery_items: {
        Row: DeliveryItem
        Insert: Pick<DeliveryItem, 'delivery_id' | 'po_item_id' | 'quantity_received'> & Partial<Omit<DeliveryItem, 'id' | 'delivery_id' | 'po_item_id' | 'quantity_received' | 'created_at'>> & {
          created_at?: string
        }
        Update: Partial<Omit<DeliveryItem, 'id'>>
      }
      employees: {
        Row: Employee
        Insert: Pick<Employee, 'company_id' | 'first_name' | 'last_name' | 'employee_type' | 'job_title'> & Partial<Omit<Employee, 'id' | 'company_id' | 'first_name' | 'last_name' | 'employee_type' | 'job_title' | 'created_at' | 'updated_at' | 'status' | 'date_hired'>> & {
          status?: EmployeeStatus
          date_hired?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Employee, 'id'>>
      }
      attendance: {
        Row: Attendance
        Insert: Pick<Attendance, 'employee_id' | 'status' | 'recorded_by'> & Partial<Omit<Attendance, 'id' | 'employee_id' | 'status' | 'recorded_by' | 'created_at' | 'date'>> & {
          date?: string
          created_at?: string
        }
        Update: Partial<Omit<Attendance, 'id'>>
      }
      cash_advances: {
        Row: CashAdvance
        Insert: Pick<CashAdvance, 'company_id' | 'employee_id' | 'amount' | 'remaining_balance'> & Partial<Omit<CashAdvance, 'id' | 'company_id' | 'employee_id' | 'amount' | 'remaining_balance' | 'created_at' | 'status'>> & {
          status?: CashAdvanceStatus
          created_at?: string
        }
        Update: Partial<Omit<CashAdvance, 'id'>>
      }
      employee_loans: {
        Row: EmployeeLoan
        Insert: Pick<EmployeeLoan, 'company_id' | 'employee_id' | 'loan_type' | 'principal' | 'remaining_balance' | 'monthly_amortization' | 'start_date'> & Partial<Omit<EmployeeLoan, 'id' | 'company_id' | 'employee_id' | 'loan_type' | 'principal' | 'remaining_balance' | 'monthly_amortization' | 'start_date' | 'created_at' | 'status'>> & {
          status?: LoanStatus
          created_at?: string
        }
        Update: Partial<Omit<EmployeeLoan, 'id'>>
      }
      payroll: {
        Row: Payroll
        Insert: Pick<Payroll, 'company_id' | 'period_start' | 'period_end'> & Partial<Omit<Payroll, 'id' | 'company_id' | 'period_start' | 'period_end' | 'created_at' | 'updated_at' | 'status' | 'total_amount' | 'pay_type'>> & {
          pay_type?: PayrollPayType
          status?: PayrollStatus
          total_amount?: number
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Payroll, 'id'>>
      }
      payroll_items: {
        Row: PayrollItem
        Insert: Pick<PayrollItem, 'payroll_id' | 'employee_id'> & Partial<Omit<PayrollItem, 'id' | 'payroll_id' | 'employee_id' | 'total_deductions' | 'gross_pay' | 'net_pay' | 'created_at'>> & {
          created_at?: string
        }
        Update: Partial<Omit<PayrollItem, 'id' | 'total_deductions' | 'gross_pay' | 'net_pay'>>
      }
      project_costs: {
        Row: ProjectCost
        Insert: Pick<ProjectCost, 'project_id' | 'category' | 'description' | 'amount' | 'recorded_by'> & Partial<Omit<ProjectCost, 'id' | 'project_id' | 'category' | 'description' | 'amount' | 'recorded_by' | 'created_at' | 'date'>> & {
          date?: string
          created_at?: string
        }
        Update: Partial<Omit<ProjectCost, 'id'>>
      }
      expenses: {
        Row: Expense
        Insert: Pick<Expense, 'company_id' | 'category' | 'description' | 'amount' | 'submitted_by'> & Partial<Omit<Expense, 'id' | 'company_id' | 'category' | 'description' | 'amount' | 'submitted_by' | 'created_at' | 'status' | 'date'>> & {
          status?: ExpenseStatus
          date?: string
          created_at?: string
        }
        Update: Partial<Omit<Expense, 'id'>>
      }
      equipment: {
        Row: Equipment
        Insert: Pick<Equipment, 'company_id' | 'name'> & Partial<Omit<Equipment, 'id' | 'company_id' | 'name' | 'created_at' | 'updated_at' | 'status'>> & {
          status?: EquipmentStatus
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Equipment, 'id'>>
      }
      equipment_assignments: {
        Row: EquipmentAssignment
        Insert: Pick<EquipmentAssignment, 'equipment_id' | 'project_id' | 'assigned_by'> & Partial<Omit<EquipmentAssignment, 'id' | 'equipment_id' | 'project_id' | 'assigned_by' | 'created_at' | 'assigned_date'>> & {
          assigned_date?: string
          created_at?: string
        }
        Update: Partial<Omit<EquipmentAssignment, 'id'>>
      }
      documents: {
        Row: Document
        Insert: Pick<Document, 'company_id' | 'name' | 'type' | 'file_path' | 'uploaded_by'> & Partial<Omit<Document, 'id' | 'company_id' | 'name' | 'type' | 'file_path' | 'uploaded_by' | 'created_at'>> & {
          created_at?: string
        }
        Update: Partial<Omit<Document, 'id'>>
      }
      notifications: {
        Row: Notification
        Insert: Pick<Notification, 'company_id' | 'user_id' | 'title' | 'message'> & Partial<Omit<Notification, 'id' | 'company_id' | 'user_id' | 'title' | 'message' | 'created_at' | 'is_read' | 'type'>> & {
          type?: NotificationType
          is_read?: boolean
          created_at?: string
        }
        Update: Partial<Omit<Notification, 'id'>>
      }
      audit_logs: {
        Row: AuditLog
        Insert: Pick<AuditLog, 'company_id' | 'action' | 'table_name'> & Partial<Omit<AuditLog, 'id' | 'company_id' | 'action' | 'table_name' | 'created_at'>> & {
          created_at?: string
        }
        Update: Partial<Omit<AuditLog, 'id'>>
      }
      subscriptions: {
        Row: Subscription
        Insert: Pick<Subscription, 'company_id' | 'plan' | 'amount' | 'period_start' | 'period_end'> & Partial<Omit<Subscription, 'id' | 'company_id' | 'plan' | 'amount' | 'period_start' | 'period_end' | 'created_at' | 'status'>> & {
          status?: SubscriptionStatus
          created_at?: string
        }
        Update: Partial<Omit<Subscription, 'id'>>
      }
    }
    Views: {
      project_cost_summary: {
        Row: ProjectCostSummary
      }
    }
    Functions: {
      fn_record_delivery: {
        Args: {
          p_purchase_order_id: string
          p_delivery_date: string
          p_received_by: string
          p_items: Json
          p_notes?: string
        }
        Returns: string
      }
      fn_reserve_stock: {
        Args: {
          p_project_id: string
          p_material_id: string
          p_quantity: number
          p_purpose: string
          p_reserved_by: string
        }
        Returns: string
      }
      fn_fulfill_reservation: {
        Args: {
          p_reservation_id: string
          p_performed_by: string
        }
        Returns: void
      }
      fn_complete_transfer: {
        Args: {
          p_transfer_id: string
          p_approved_by: string
        }
        Returns: void
      }
      fn_report_waste: {
        Args: {
          p_project_id: string
          p_material_id: string
          p_quantity: number
          p_waste_reason: string
          p_performed_by: string
        }
        Returns: void
      }
      fn_cancel_reservation: {
        Args: {
          p_reservation_id: string
          p_performed_by: string
        }
        Returns: void
      }
    }
    Enums: Record<string, never>
  }
}
