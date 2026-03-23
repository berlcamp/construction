# Phase 1: Foundation & Auth - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-24
**Mode:** discuss --analyze
**Areas covered:** Company onboarding UX, Sidebar nav scope, Invitation flow UX, Trial indicator in UI

---

## Area 1: Company Onboarding UX

**Q: How should company creation onboarding work?**
Options presented:
- Multi-step wizard (2 steps) — Step 1: name + industry (required). Step 2: address/contact (optional/skippable). *(Recommended)*
- Single-page form — All fields in one form.
- Name only, expand later — Just company name, rest in Settings.

**Selected:** Multi-step wizard (2 steps) *(Recommended)*

---

**Q: What fields should Step 1 (required) include?**
Options presented:
- Company name only *(Recommended)*
- Name + industry/type
- Name + address

**Selected:** Company name only *(Recommended)*

---

**Q: Step 2 (optional/skippable) — what fields?**
Options presented:
- Address + phone *(Recommended)*
- Address + phone + email
- Skip Step 2 entirely

**Selected:** Address + phone *(Recommended)*

---

**Q: Where does the user land after completing company creation?**
Options presented:
- Dashboard *(Recommended)*
- Welcome/setup checklist

**Selected:** Dashboard *(Recommended)*

---

## Area 2: Sidebar Nav Scope

**Q: What nav items appear in the Phase 1 sidebar?**
Options presented:
- Full nav, all modules disabled — All groups rendered, unbuilt items grayed. *(Recommended)*
- Phase-scoped nav only — Only Dashboard + Settings visible in Phase 1.

**Selected:** Full nav, all modules disabled *(Recommended)*
*(User confirmed visual mockup preview)*

---

**Q: Should the sidebar support collapsing to icon-only mode?**
Options presented:
- Yes, collapsible — Toggle between full and icon-only. Redux-persisted. *(Recommended)*
- No, always expanded — Fixed-width sidebar.

**Selected:** Yes, collapsible *(Recommended)*
*(User confirmed visual mockup preview)*

---

## Area 3: Invitation Flow UX

**Q: What is the invited user's experience when clicking the invite link?**
Options presented:
- Accept page first — Link → branded accept page → "Accept & sign in with Google" → membership created. *(Recommended)*
- Direct OAuth (no accept page) — Link → straight to Google OAuth → token resolved on callback.

**Selected:** Accept page first *(Recommended)*
*(User confirmed accept page mockup showing company name, inviter, role, expiry)*

---

**Q: What happens with an expired invite token?**
Options presented:
- Error page with re-invite prompt — "This invitation has expired. Ask [company] to send a new invite." *(Recommended)*
- Redirect to /login with toast — Quietly redirect with error toast.

**Selected:** Error page with re-invite prompt *(Recommended)*

---

## Area 4: Trial Indicator in UI

**Q: How should the 14-day trial be indicated in the Phase 1 UI?**
Options presented:
- Header badge — Small chip: "Trial — X days left". Pulls from companies.trial_ends_at. *(Recommended)*
- Silent (DB only) — No trial UI in Phase 1.
- Dismissible banner — Yellow banner below header.

**Selected:** Header badge *(Recommended)*
*(User confirmed header layout mockup: `[Breadcrumbs] ... [🔔] [Trial — 12 days] [👤 User]`)*

---

*Log complete. All decisions captured in 01-CONTEXT.md.*
