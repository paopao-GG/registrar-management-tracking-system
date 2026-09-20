## changes

# staff

- Course to Program
- Documents to Requested Documents/Services
- Prepared By to Received/Prepared By
- Signed by to Reviewed/Signed By
- Surname first
- Add Total Incomplete, Today's Completed, Unclaimed (Signed)
- Add filtering for Status in Today's Request
- Show in Incomplete/Unclaimed Documents the documents from the days before
- Add search name feature for Unclaimed Documents

# admin

- Report should have the columns | External Client Name | Service Availed | Day of Service Completion |
- No need to include the number of documents requested

---

# v2 (implemented September 17, 2026)

Requested in [v2.md](v2.md). Design details are in [TECHNICAL_DESIGN.md](TECHNICAL_DESIGN.md).

# general

- Programs shown in abbreviated form (e.g. BSIT-1)
- Row checkboxes with bulk actions: Start Processing, Sign, and Release to One Claimant (one signature for a whole block)
- Pages moved into a menu button so tables use the full width
- Reviewed/Signed By removed from the dashboards (still in the BUP Logbook)
- Actions column moved beside Status
- Smaller dates
- Dashboards show one day at a time (default today); date filter now comes before status
- Horizontal scrollbar placed above the table

# admin

- Students: abbreviated programs, "Enrolled Students" title with total count, program filter, BU Email and Contact Number columns
- Reports: "ARTA-Logbook export" and "BUP-Logbook export" (Excel) with the orange "COLLEGE/CAMPUS: BICOL UNIVERSITY POLANGUI" header
- ARTA columns: External Client Name, Requested Documents/Services, Contact Number, University Email Address, Date of Transaction
- BUP columns: Date, Name, Sex, Course & Year Level, COR/COG/GMC/AUTH/OTR/OTHERS, Received/Prepared By, Reviewed/Signed By, Duration of Process, Released To/Claimed By, Signature, with a TOTAL row
- Audit Log: Transaction ID removed, total logs shown, Today view by default

# staff

- "Add New" removed from the Student Name dropdown
- Alumni button for alumni requests
- CMC corrected to GMC (existing counts kept)

# sign page

- Data Privacy Act consent checkbox required before Done
- Usable on one device at a time (Reset Sign Device button on the dashboards)
- Only available while a staff member is active

# data

- Students now have optional Sex and Contact Number (also accepted as roster import columns)
- Database migration: `20260917000000_v2_updates`
