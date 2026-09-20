# Registrar Transaction Management System — Functional Specification

> **Scope:** Internal system for registrar staff only. No student-facing portal.
> **Expected Volume:** 20–50 service requests per day.
> **Date Format:** MM-DD-YYYY (used system-wide). All dates follow Philippine time.
> **Last updated:** September 17, 2026 (v2 changes). See [TECHNICAL_DESIGN.md](TECHNICAL_DESIGN.md) for how these features are built.

---

## 1. User Roles & Permissions

### Admin (Registrar)
- View the Admin Dashboard (one day at a time)
- Review and sign documents, one at a time or in bulk
- View and manage the enrolled student directory (add, import, remove)
- Generate reports and export the ARTA and BUP logbooks
- Manage staff accounts (add, edit, deactivate, reset password)
- View audit logs
- Reset the signing tablet

### Staff
- Encode new requests for students and alumni
- Start processing requests, one at a time or in bulk
- Release documents, including releasing several requests to one claimant with one signature
- Import the student roster from the request form
- Reset the signing tablet

### Claimant (no account)
- Signs on the signing tablet to acknowledge receipt, after agreeing to the Data Privacy consent

---

## 2. Login Page

**Fields:**
- Username
- Password

**Buttons:**
- Login
- Forgot Password → Triggers admin-assisted password reset (staff contacts admin; admin uses "Reset Password" in Staff Management)
- Logout (available on all pages in the top bar)

**Behavior:**
- On login, redirect based on role:
  - Staff → Staff Dashboard
  - Registrar → Admin Dashboard
- Session timeout after 30 minutes of inactivity

---

## 3. Layout

- The page list is hidden behind a **menu button** at the top left, so tables use the full screen width.
- The top bar shows the current page, the user's name, the light/dark theme toggle and Logout.
- Wide tables show their horizontal scrollbar **above** the column headers.

---

## 4. Student Database

- Students come from the Registrar's roster file (CSV or XLSX). Each import is treated as the complete, current list:
  - students in the file are added or updated;
  - students missing from the file become inactive;
  - no records or transaction history are deleted.
- **Roster columns:**
  - Required: Student Number, Last Name, First Name, Program, Year Level.
  - Optional: Middle Name, Email Address, **Sex** (M/F), **Contact Number**.
- Programs may be written in full or abbreviated (e.g. BSIT). Tables show the abbreviation.
- When encoding a request, the Student Name field searches by surname or student number. It also finds students who are not enrolled this semester, listed after enrolled students.
- **Alumni** are graduates and are not in the roster. Staff add them with the **Alumni** button on the request form, using the same details as a student except Year Level. Alumni are shown as "Alumni" in place of a year level and are never deactivated by a roster import.
- **Not Enrolled** students are students missing from the current roster. They are shown as "Not Enrolled" in place of a year level (e.g. BSIT-Not Enrolled).
  - Students from an earlier roster are found by the search.
  - Staff add anyone else with the **Add Student** button on the request form. Its Year Level is fixed to "Not Enrolled".
  - A not-enrolled student is not listed on the Enrolled Students page. If a later roster includes them, they become enrolled again.
  - Graduates from an earlier roster also appear as Not Enrolled; use **Alumni** for graduates.

---

## 5. Staff Dashboard

### Section 1: Summary cards
New Requests (Pending), Processing, Ready for Release and Completed, all for the selected period.

### Section 2: New Request

| Field | Type / Behavior |
| :--- | :--- |
| DATE | Auto-filled (MM-DD-YYYY) |
| RECEIVED/PREPARED BY | Auto-filled from the logged-in account |
| STUDENT NAME | Search existing students, including not-enrolled ones. **Add Student** next to the label adds a not-enrolled student; **Alumni** adds an alumni requester. |
| PROGRAM & YEAR | Auto-filled from the selected record |
| REQUESTED DOCUMENTS/SERVICES | Counter buttons (−/+) per type: **COR, COG, GMC, AUTH, OTR** |
| OTHERS | Text input + quantity counter |

### Section 3: Transactions

**Filters, in order:** Date (Today, Yesterday or **Date Range**; default Today), Status, Program, Year, Search by student name. Only transactions created in the selected period are shown, and the summary cards cover the same period.

**Date Range** shows a From and a To date, starting on the past week. Either box can be cleared: From alone means "since that day", To alone means "up to that day", and clearing both shows every date. The range combines with every other filter, so, for example, documents still waiting to be claimed over the past month are Date Range + Status "Ready for Release".

A request still waiting to be claimed since an earlier day is marked "**N**d waiting" under its date, so older ones stand out.

| Column | Notes |
| :--- | :--- |
| ☐ (select) | Checkbox for bulk actions; the header box selects all rows |
| DATE | Date the request was created |
| STUDENT | Surname first |
| PROGRAM | Abbreviated with year level, e.g. BSIT-1, BSIT-Alumni or BSIT-Not Enrolled |
| REQUESTED DOCUMENTS/SERVICES | e.g. COR(1), GMC(2), Others: … |
| STATUS | See status rules below |
| ACTIONS | Start Processing, Release or View Signature, depending on status |
| RECEIVED/PREPARED BY | Name, date and time |
| DURATION | Prepared → Signed |
| RELEASED TO | Claimant name, date and time |

The Reviewed/Signed By column is not shown on the dashboards; it appears in the BUP Logbook.

**Bulk actions:** after selecting rows, a bar shows the actions that apply to them:
- **Start Processing (n)** for selected Pending requests.
- **Release to One Claimant (n)** for selected Ready for Release requests. One representative (e.g. for a whole block) signs once, and every selected request is released with that signature.

**Status Rules:**

| Status | Trigger |
| :--- | :--- |
| Pending | Staff saves a new request |
| Processing | Staff clicks Start Processing |
| Ready for Release | Registrar (Admin) signs |
| Released | Staff confirms the claimant's tablet signature |

### Release flow
1. Staff enters the claimant's name (the dialog suggests the students' names).
2. Staff clicks **Sign on Tablet**. The tablet shows the claimant's name and, for a bulk release, the number of documents and the students they are for.
3. Staff sees a live preview while the claimant signs.
4. When the claimant finishes, staff clicks **Confirm Release**. A signing left unconfirmed for 10 minutes ends by itself, and the tablet returns to waiting.

### Reset Tablet
A button at the top of the dashboard frees the signing tablet so the sign page can be opened on a different device.

---

## 6. Admin Dashboard

- The same summary cards and transaction table as the Staff Dashboard, covering requests from **all staff**.
- **Filters, in order:** Date range as From and To (both default to today), Status, Program, Year.
- **Actions:** Sign, for Processing requests. Selecting rows enables **Sign (n)** for bulk signing.
- Reset Tablet button.

---

## 7. Signing Tablet (`/sign`)

- Shows "Ready for Signature" until staff sends a release.
- Shows the claimant's name, a signature pad and a **consent checkbox** below the pad: *"I agree to the capture and storage of my signature as proof of document release, and I consent to the processing of my personal information in accordance with the Data Privacy Act of 2012 (Republic Act No. 10173)."*
- **Done** stays disabled until the box is ticked. The box resets for each claimant.
- After Done, the tablet shows "Signature Submitted" until staff confirms, then "Signature Confirmed".

**Security rules**

The tablet never logs in. Two conditions must both hold, and the server enforces both, so the page cannot be bypassed by calling the API directly.

- **One device only.** The first device to open the sign page registers itself as the signing tablet. Another device opening the same URL shows "Tablet Already in Use". Refreshing or reconnecting on the registered device keeps it. If that device is closed for about a minute another may take over, or staff and admin can press **Reset Tablet** on their dashboard, for example when the tablet is replaced or its browser data was cleared.
- **A Staff member must be signed in.** While no staff member is working in RTAMS the page shows "Signature Pad Inactive — Staff login required", and it returns to the waiting screen within a few seconds of a staff member signing in. Staff stay counted as working while their dashboard is open, and logging out makes the tablet inactive right away.
- **Admin does not activate it.** An admin cannot release documents, so an admin session alone leaves the page inactive.

---

## 8. Students Page (Admin)

- Title: **Enrolled Students**, with the total number of students shown above the table.
- **Filters:** Program (abbreviations) and search by name or student number.
- **Columns:** Student #, Name, Program (abbreviated), Year, **BU Email**, **Contact Number**, Action (Remove).
- **Buttons:** Add Student, Import CSV/XLSX.
- The list is paginated (50 per page). Alumni and inactive students are not listed.
- A student with existing transactions cannot be removed.

---

## 9. Reports (Admin)

**Filters:** Start date and end date. The report covers documents **released** in that range.

**Preview:** the ARTA columns for the range, numbered, with the number of transactions. Signatures are not shown on screen; they appear in the downloaded file.

**Downloads:** both files are Excel (.xlsx). The ARTA file opens with **Government Office Name: Bicol University Polangui** and a note that the listed clients have completed the service availed; the BUP file opens with an orange header row reading **COLLEGE/CAMPUS: BICOL UNIVERSITY POLANGUI**.

**ARTA-Logbook export**

| # | External Client Name | Service Availed | Client Contact | Client Contact Info (Email Address) | Day of Service Completion | Signature |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |

- The Day of Service Completion is the date the documents were released.
- Client Contact reads **NONE** when no contact number is on file.
- The Signature column holds the claimant's captured signature, the same image as in the BUP logbook.

**BUP-Logbook export**

| No. | Date | Name | Sex (M/F) | Course & Year Level | Requested Documents/Services | Received/Prepared By | Reviewed/Signed By | Duration of Process | Released To/Claimed By | Signature |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |

- Rows are numbered from 1 in each export.
- Requested Documents/Services is split into COR, COG, GMC, AUTH, OTR and OTHERS, each holding the count for that request. The OTHERS description appears as a cell note.
- The three "By" columns show the name with the date and time.
- The Signature column shows the claimant's captured signature with no background.
- The last row, **TOTAL**, sums each document column.

---

## 10. Staff Management Page (Admin)

**Columns:** Staff Name, Username, Role (Admin / Staff), Status (Active / Inactive)

**Actions:**
- Add Staff — creates new account with temporary password
- Edit — update name, role
- Deactivate — soft-delete (preserves transaction history)
- Reset Password — generates temporary password for staff

---

## 11. Audit Log (Admin)

- Every status change is logged with the timestamp, the user who made it, the action, and the previous and new status.
- **Filters:** start and end date, a **Today** button (the default view) and an **All Dates** button.
- **Total logs** for the current filter is shown above the table.
- **Columns:** Timestamp, Action, Previous Status, New Status, Performed By.
- The list is paginated (50 per page).

---

## 12. Workflow Summary

1. **Staff logs in** → sees today's requests and the New Request form.
2. **Encodes a request** → selects a student (or adds a not-enrolled student or an alumni requester), sets document counts, saves → **Pending**.
3. **Starts processing** → one request or several at once → **Processing**.
4. **Registrar signs** → one request or several at once → **Ready for Release**, duration recorded.
5. **Claimant arrives** → staff selects one or more ready requests, enters the claimant's name and sends to the tablet → the claimant consents and signs → staff confirms → **Released**.
6. **Reports** → Admin downloads the ARTA and BUP logbooks for any date range.
