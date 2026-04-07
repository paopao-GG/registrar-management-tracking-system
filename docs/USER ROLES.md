# Registrar Transaction Management System — Functional Specification

> **Scope:** Internal system for registrar staff only. No student-facing portal.
> **Expected Volume:** 20–50 service requests per day.
> **Date Format:** MM-DD-YYYY (used system-wide).

---

## 1. User Roles & Permissions

### Admin (Registrar)
- View dashboards and all transactions
- Generate and export reports (daily, periodic)
- Manage staff accounts (add, edit, deactivate, reset password)
- Review and sign prepared documents
- View audit logs

### Staff
- Input new service transactions
- Update transaction status (processing → released)
- View and complete their own incomplete/unclaimed requests
- Cannot view other staff members' pending requests

---

## 2. Login Page

**Fields:**
- Username
- Password

**Buttons:**
- Login
- Forgot Password → Triggers admin-assisted password reset (staff contacts admin; admin uses "Reset Password" in Staff Management)
- Logout (available on all pages via header/navbar)

**Behavior:**
- On login, redirect based on role:
  - Staff → Staff Dashboard
  - Registrar → Admin Dashboard
- Session timeout after 30 minutes of inactivity

---

## 3. Student Database

- Students are manually entered and saved to the database.
- Fields: Name, Course, Year Level
- When encoding a new request, the NAME field autocompletes from existing student records.
- If the student doesn't exist, staff can add a new student inline.

---

## 4. Staff Dashboard

### Section 1: Today's Requests

| Column | Type / Behavior | Notes |
| :--- | :--- | :--- |
| DATE | Auto-filled (MM-DD-YYYY) | Date of service request |
| NAME | Autocomplete from student database | Staff selects existing student or adds new |
| COURSE & YEAR LEVEL | Auto-filled from student record | Non-editable (pulled from student database) |
| REQUESTED DOCUMENTS | Counter buttons (−/+) per type: COR, COG, CMC, AUTH, OTR | Quantity auto-counted for daily summary |
| OTHERS (free text) | Text input + counter | Freeform — logged as-is for reporting |
| RECEIVED/PREPARED BY: STAFF | Auto-filled | From logged-in account |
| RECEIVED/PREPARED BY: DATE & TIME | Auto-filled | Timestamp on save |
| REVIEWED/SIGNED BY: STAFF | Auto-filled | Always the Registrar (Admin). Only the Admin can sign documents. |
| REVIEWED/SIGNED BY: DATE & TIME | Auto-filled | Timestamp when reviewer marks as signed |
| DURATION OF PROCESS | Auto-calculated | Prepared timestamp → Signed timestamp (calendar time) |
| RELEASED TO / CLAIMED BY: NAME | Text input | Person who physically claims the document |
| RELEASED TO / CLAIMED BY: SIGNATURE | Signature pad or confirmation | Claimer signs to acknowledge receipt |
| RELEASED TO / CLAIMED BY: DATE & TIME | Auto-filled | Timestamp on release |
| STATUS | Auto-filled | See status rules below |

**Status Rules:**
| Status | Trigger |
| :--- | :--- |
| Processing | Assigned when staff saves a new request |
| Signed | Assigned when reviewer completes review |
| Released | Assigned when staff encodes the claimer name and signature |

### Section 2: Incomplete/Unclaimed Documents
- Shows all unreleased or unfinished requests **belonging to the logged-in staff**
- Staff can complete or release these requests
- Duration and status auto-update

---

## 5. Admin Dashboard

### Section 1: All Incomplete/Unreleased Requests
- Same columns as Staff Dashboard table
- Shows requests from **all staff**
- Filterable by: program & year level, status, date range, staff member

### Section 2: Quick Statistics
- Total Incomplete Requests (Processing + Signed, not yet Released)
- Total Unclaimed Documents (Signed, awaiting claim)
- Today's completed transactions count

---

## 6. Summary Reports (Admin)

**Filters:** Date range (single day, weekly, monthly, custom range)

**Columns:**
- Service type (COR, COG, CMC, AUTH, OTR, Others)
- Total processed in selected period
- Breakdown by staff member
- Average processing duration

**Export:** CSV

---

## 7. Staff Management Page (Admin)

**Columns:** Staff Name, Username, Role (Admin / Staff), Status (Active / Inactive)

**Actions:**
- Add Staff — creates new account with temporary password
- Edit — update name, role
- Deactivate — soft-delete (preserves transaction history)
- Reset Password — generates temporary password for staff

---

## 8. Audit Log

All status changes are logged with: timestamp, user who made the change, previous status, new status. Viewable by Admin only.

---

## 9. Workflow Summary

1. **Staff logs in** → Sees today's empty request form + past incomplete items
2. **Encodes new request** → Selects student, selects documents, saves → Status = **Processing**
3. **Registrar reviews** → Signs off on prepared document → Status = **Signed**
4. **Student claims document** → Staff records claimer name + signature → Status = **Released**, duration calculated
5. **Reports** → Admin generates daily/periodic reports on demand, exportable as CSV
