# Registrar Transaction Management System — Functional Specification

> **Scope:** Internal system for registrar staff only. No student-facing portal.
> **Expected Volume:** 20–50 service requests per day.
> **Date Format:** YYYY-MM-DD (used system-wide, including the logbooks). The dashboard greeting alone spells the day out, e.g. "Wednesday, October 28, 2026". All dates follow Philippine time.
> **Last updated:** October 28, 2026 (OTR forwarding, authorization letters; see [changes.md](changes.md)). See [TECHNICAL_DESIGN.md](TECHNICAL_DESIGN.md) for how these features are built.

---

## 1. User Roles & Permissions

### Admin (Registrar)
- View the Admin Dashboard (one day at a time)
- Review and sign documents, one at a time or in bulk
- View and manage the enrolled student directory (add, import, remove)
- Generate reports and export the ARTA and BUP logbooks
- Manage staff accounts (add, edit, deactivate, reset password)
- View audit logs
- Reset the sign device

### Staff
- Encode new requests for students and alumni
- Start processing requests, one at a time or in bulk
- Release documents, including releasing several requests to one claimant with one signature
- Confirm the authorization letter when someone other than the requestor claims
- Forward signed OTR requests to the main campus
- Import the student roster from the request form
- Reset the sign device

### Claimant (no account)
- Signs on the sign device to acknowledge receipt, after agreeing to the Data Privacy consent
- May be the student or an **authorized representative** carrying an authorization letter

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
New Requests (Pending), Processing, Ready for Release / Forwarding and Completed (Released plus Forwarded), all for the selected period.

### Section 2: New Request

| Field | Type / Behavior |
| :--- | :--- |
| DATE | Auto-filled (YYYY-MM-DD) |
| RECEIVED/PREPARED BY | Auto-filled from the logged-in account |
| STUDENT NAME | Search existing students, including not-enrolled ones. **Add Student** next to the label adds a not-enrolled student; **Alumni** adds an alumni requester. |
| PROGRAM & YEAR | Auto-filled from the selected record, e.g. BSIT - 1st Year |
| REQUESTED DOCUMENTS/SERVICES | Counter buttons (−/+) per type: **COR, COG, AUTH**, plus **GMC** for undergraduates only (hidden for alumni) |
| OTHERS | Text input + quantity counter. **OTR** is entered here (see below). |

**OTR requests.** OTRs are released at the main campus; this office only does the initial processing. When Others contains "OTR" or "Transcript of Records":
- the form notes that the request will be forwarded to the main campus;
- it must be saved as its own request: OTR cannot be combined with COR, COG, GMC or AUTH counts (the server rejects it too);
- after the Registrar signs, it goes to **For Forwarding** instead of Ready for Release, and staff **Forward** it rather than releasing it. No claimant signature is taken.

### Section 3: Transactions

**Filters, in order:** Date (Today, Yesterday or **Date Range**; default Today), Status, Program, Year (1st Year to 4th Year, Alumni, Not Enrolled), Search by student name. Only transactions created in the selected period are shown, and the summary cards cover the same period.

**Date Range** shows a From and a To date, starting on the past week. Either box can be cleared: From alone means "since that day", To alone means "up to that day", and clearing both shows every date. The range combines with every other filter, so, for example, documents still waiting to be claimed over the past month are Date Range + Status "Ready for Release".

A request still waiting to be claimed or forwarded since an earlier day is marked "**N**d waiting" under its date, so older ones stand out.

| Column | Notes |
| :--- | :--- |
| ☐ (select) | Checkbox for bulk actions; the header box selects all rows |
| DATE | Date the request was created |
| STUDENT | Surname first |
| PROGRAM | Abbreviated with year level, e.g. BSIT-1, BSIT-Alumni or BSIT-Not Enrolled |
| REQUESTED DOCUMENTS/SERVICES | e.g. COR(1), GMC(2), Others: … |
| STATUS | See status rules below |
| ACTIONS | Start Processing, Release, Forward or View Signature, depending on status |
| RECEIVED/PREPARED BY | Name, date and time |
| DURATION | Prepared → Signed |
| RELEASED TO | Claimant name, date and time; "Authorized Rep." when claimed with an authorization letter; "Main Campus" for forwarded OTRs |

The Reviewed/Signed By column is not shown on the dashboards; it appears in the BUP Logbook.

**Bulk actions:** after selecting rows, a bar shows the actions that apply to them:
- **Start Processing (n)** for selected Pending requests.
- **Release to One Claimant (n)** for selected Ready for Release requests. One representative (e.g. for a whole block) signs once, and every selected request is released with that signature.
- **Forward (n)** for selected For Forwarding requests.

**Status Rules:**

| Status | Trigger |
| :--- | :--- |
| Pending | Staff saves a new request |
| Processing | Staff clicks Start Processing |
| Ready for Release | Registrar (Admin) signs |
| Released | Staff confirms the claimant's signature |
| For Forwarding | Registrar (Admin) signs an OTR request |
| Forwarded | Staff forwards it to the main campus |

### Release flow
1. The dialog shows the documents to claim. One request is listed inline; for two or more, **View documents to claim (n)** opens the full list.
2. Staff enters the claimant's name (the dialog suggests the students' names).
3. **Authorization letter.** If the name matches none of the students in the release, the dialog asks for an authorization letter. Staff must tick **Authorization letter received and verified** before sending to the sign device or confirming. Word order, commas and capitals don't matter ("Juan Dela Cruz" matches "Dela Cruz, Juan"), and an initial matches a middle name.
4. Staff clicks **Send to Sign Device** and sees a live preview while the claimant signs. **Cancel Signing** takes effect at once.
5. When the claimant finishes, staff clicks **Confirm Release**. A signing left unconfirmed for 10 minutes ends by itself, and the sign device returns to waiting.

A release made with an authorization letter is recorded as such and shown as "Authorized Rep." in the table and the BUP logbook.

### Forward flow (OTR)
Staff clicks **Forward** on a For Forwarding request (or **Forward (n)** for several) and confirms. The request becomes **Forwarded**, with Released To set to "Main Campus" and the forward date and time.

### Reset Sign Device
A button at the top of the dashboard frees the sign-device lock so the sign page can be opened on a different device.

---

## 6. Admin Dashboard

- The same summary cards and transaction table as the Staff Dashboard, covering requests from **all staff**.
- **Filters, in order:** Date range as From and To (both default to today), Status (including For Forwarding and Forwarded), Program, Year.
- **Actions:** Sign, for Processing requests. Selecting rows enables **Sign (n)** for bulk signing.
- Reset Sign Device button.

---

## 7. Sign Device (`/sign`)

- Shows "Ready for Signature" until staff sends a release.
- **Step 1, Data Privacy Notice.** Shows the claimant's name ("Authorized Representative" below it when claiming for someone else), the documents to claim, and the notice: *"I agree to the capture and storage of my signature as proof of document release, and I consent to the processing of my personal information in accordance with the Data Privacy Act of 2012 (Republic Act No. 10173)."* The claimant taps **I Agree**. On a phone held sideways the screen splits into two columns so I Agree is visible without scrolling.
- **Documents to claim.** One request is listed inline. For two or more, the claimant taps **View documents to claim (n)** to open the list; on the signing screen the "Claiming n documents · View" line opens the same list.
- **Step 2, signature pad.** The claimant signs and taps **Done**.
- After Done, the sign device shows "Signature Submitted" until staff confirms, then "Signature Confirmed".

**Security rules**

The sign device never logs in. Two conditions must both hold, and the server enforces both, so the page cannot be bypassed by calling the API directly.

- **One device only.** The first device to open the sign page registers itself as the sign device. Another device opening the same URL shows "Device Already in Use". Refreshing or reconnecting on the registered device keeps it. If that device is closed for about a minute another may take over, or staff and admin can press **Reset Sign Device** on their dashboard, for example when the device is replaced or its browser data was cleared.
- **A Staff member must be signed in.** While no staff member is working in RTAMS the page shows "Signature Pad Inactive — Staff login required", and it returns to the waiting screen within a few seconds of a staff member signing in. Staff stay counted as working while their dashboard is open, and logging out makes the sign device inactive right away.
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

**Filters:** Start date and end date. The report covers documents **released**, and OTRs **forwarded**, in that range.

**Preview:** the ARTA columns for the range, numbered, with the number of transactions. Signatures are not shown on screen; they appear in the downloaded file.

**Downloads:** both files are Excel (.xlsx). The ARTA file opens with **Government Office Name: Bicol University Polangui** and a note that the listed clients have completed the service availed; the BUP file opens with an orange header row reading **COLLEGE/CAMPUS: BICOL UNIVERSITY POLANGUI**.

**ARTA-Logbook export**

| # | External Client Name | Service Availed | Client Contact | Client Contact Info (Email Address) | Day of Service Completion |
| :--- | :--- | :--- | :--- | :--- | :--- |

- The Day of Service Completion is the date the documents were released or forwarded.
- Client Contact reads **NONE** when no contact number is on file.
- The ARTA logbook has no Signature column.

**BUP-Logbook export**

| No. | Date | Name | Sex (M/F) | Course & Year Level | Requested Documents/Services | Received/Prepared By | Reviewed/Signed By | Duration of Process | Released To/Claimed By | Signature |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |

- Rows are numbered from 1 in each export.
- Requested Documents/Services is split into COR, COG, GMC, AUTH and OTHERS. OTHERS holds each service with its count, e.g. "OTR - 1"; older requests that used the former OTR counter are listed there too.
- The three "By" columns show the name with the date and time. Released To/Claimed By adds "(Authorized Rep.)" for a release made with an authorization letter, and reads "Main Campus" for forwarded OTRs.
- The Signature column shows the claimant's captured signature with no background. Forwarded OTRs have none.
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
4. **Registrar signs** → one request or several at once → **Ready for Release**, duration recorded. OTR requests go to **For Forwarding**.
5. **Claimant arrives** → staff selects one or more ready requests, enters the claimant's name (confirming the authorization letter if the claimant is not the requestor) and sends to the sign device → the claimant consents and signs → staff confirms → **Released**.
6. **OTR** → staff forwards it to the main campus → **Forwarded**.
7. **Reports** → Admin downloads the ARTA and BUP logbooks for any date range.
