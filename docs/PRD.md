# Product Requirements Document (PRD)
## Registrar Task Accomplishment Monitoring System
### Bicol University Polangui

| Field | Value |
|---|---|
| **Version** | 1.0 |
| **Date** | March 10, 2026 |
| **Status** | Draft (updated for v2) |
| **Last Updated** | September 17, 2026 |
| **Author** | — |

> **Revision — v2 (September 17, 2026).** This PRD was updated to match the implemented system after the v2 feedback round ([v2.md](v2.md)): the four-step status flow, bulk actions, per-day dashboards, alumni requests, the ARTA and BUP Excel logbooks, the single-device signing tablet with Data Privacy consent, and the PostgreSQL/Vercel stack. The design is described in [TECHNICAL_DESIGN.md](TECHNICAL_DESIGN.md).

---

## 1. Executive Summary

### Problem Statement
The Office of the Registrar at Bicol University Polangui currently tracks document requests and service transactions through manual logbooks or spreadsheets. This process is slow, error-prone, and makes it difficult to generate reports, track processing duration, or identify bottlenecks. Staff have no reliable way to see which documents remain unclaimed, and the Registrar lacks visibility into daily workload and performance metrics.

### Solution Overview
A web-based **Registrar Task Accomplishment Monitoring System (RTAMS)** that digitizes the entire document request lifecycle — from encoding a student's request, through review/signing by the Registrar, to document release and claiming. The system automates timestamps, status tracking, duration calculation, and report generation.

### Business Impact
- Eliminate manual logbook errors and data loss
- Reduce average document processing time through visibility and accountability
- Enable data-driven decisions via automated reports
- Improve student satisfaction through faster, trackable service

### Key Metrics
| Metric | Target |
|---|---|
| Average processing duration | Measurable baseline within first month |
| Unclaimed document rate | < 5% after 30 days |
| Staff adoption rate | 100% within 2 weeks of launch |
| Data entry errors | Reduced by 80% vs. manual process |

### Timeline
| Phase | Target |
|---|---|
| MVP (core transaction flow) | TBD |
| V1 (reports + staff management) | TBD |
| Deployment & testing | TBD |

---

## 2. Market Context & Opportunity

### Context
This is an **internal tool** for Bicol University Polangui's Office of the Registrar. There is no external market or competition — the alternative is the current manual process.

### User Research
Based on registrar workflow analysis:
- Staff spend significant time logging requests by hand
- Tracking unclaimed documents requires manually scanning logbooks
- Generating daily/periodic reports requires manual counting
- No reliable way to measure processing time per request

### Business Case
- **Cost:** Development time (thesis project)
- **Value:** Operational efficiency, reduced errors, institutional data capture
- **Volume:** 20–50 service requests per day

---

## 3. User Personas & Journey

### Primary Persona: Staff (Registrar Clerk)
- **Role:** Encodes student document requests, prepares documents, releases to claimants
- **Goals:** Quickly log requests, track what's pending, hand off to Registrar for review
- **Pain Points:** Manual logging is slow; hard to find incomplete requests; no automatic timestamps
- **Typical Day:** Handles 20–50 requests, switches between encoding, preparing, and releasing

### Primary Persona: Admin (Registrar)
- **Role:** Oversees all transactions, reviews/signs documents, manages staff, generates reports
- **Goals:** See all pending work at a glance, identify bottlenecks, produce accurate reports
- **Pain Points:** No dashboard visibility; report generation is manual and time-consuming

### User Journey

```
Current State (Manual):
Student arrives → Staff writes in logbook → Registrar signs physical log →
Student returns to claim → Staff writes release info → End of day: manual counting

Future State (RTAMS):
Student arrives → Staff encodes request (auto-timestamps) → Registrar reviews/signs in system →
Student returns → Staff records claimer + signature → System auto-calculates duration →
Reports generated on demand
```

### Use Cases

| # | Use Case | Actor |
|---|---|---|
| UC-1 | Encode a new document request | Staff |
| UC-2 | View and complete incomplete requests | Staff |
| UC-3 | Review and sign a prepared document | Admin |
| UC-4 | Release document to claimer (with signature) | Staff |
| UC-5 | View all incomplete/unreleased requests | Admin |
| UC-6 | Generate summary reports (daily, periodic) | Admin |
| UC-7 | Manage staff accounts | Admin |
| UC-8 | Add a new student to the database | Staff |

---

## 4. Product Goals & Success Metrics

### Objectives
1. Digitize 100% of registrar document transactions
2. Automate timestamp capture and duration calculation
3. Provide real-time dashboard visibility for the Registrar
4. Enable on-demand report generation

### Key Results
| Objective | Key Result |
|---|---|
| Digitize transactions | All daily requests encoded in system within 2 weeks of launch |
| Automate timestamps | Zero manual timestamp entry required |
| Dashboard visibility | Admin can see all pending items in < 5 seconds |
| Report generation | Reports exportable in < 10 seconds |

### Success Criteria for Launch
- [ ] Staff can encode, track, and release a request end-to-end
- [ ] Admin can view all transactions and generate reports
- [ ] All timestamps and durations are auto-calculated
- [ ] System handles 50 concurrent requests without performance issues

### Risk Metrics
- If staff bypass the system and revert to logbooks → adoption failure
- If system downtime exceeds 1 hour during office hours → reliability failure

---

## 5. Feature Requirements

### Core Features (MVP)

| ID | Feature | Priority | Description |
|---|---|---|---|
| F-01 | Login / Authentication | Must | Username/password login, role-based redirect |
| F-02 | Staff Dashboard | Must | Summary cards, new request form and the day's transactions (one day at a time, default today) with bulk Start Processing and Release |
| F-03 | Transaction Encoding | Must | New request form with student autocomplete, document type counters, auto-timestamps |
| F-04 | Student Database | Must | Roster import (CSV/XLSX) as the source of enrolled students; manual add; autocomplete search; alumni requesters added from the request form |
| F-05 | Status Tracking | Must | Pending → Processing → Ready for Release → Released |
| F-06 | Document Review/Signing | Must | Only the Registrar (Admin) can mark documents as reviewed/signed. Documents are always approved — no rejection flow. |
| F-07 | Document Release | Must | Staff records the claimant name; the claimant signs on the signing tablet after giving Data Privacy consent; auto-timestamp. One signature can release several requests. |
| F-08 | Duration Calculation | Must | Auto-calculate elapsed time from Prepared timestamp to Signed timestamp (calendar time). This measures how long the document waited for the Registrar's signature. |
| F-09 | Admin Dashboard | Must | Summary cards and all staff's requests for a selected day, status filter, bulk Sign |
| F-10 | Summary Reports | Must | By date range; export the ARTA-Logbook and BUP-Logbook as Excel (.xlsx) |
| F-11 | Staff Management | Must | Add, edit, deactivate, reset password |
| F-12 | Audit Log | Must | Log all status changes with user, timestamp, old/new status |
| F-13 | Logout + Session Timeout | Must | Logout button on all pages; 30-min inactivity timeout |

### Nice-to-Have (V2)

| ID | Feature | Description |
|---|---|---|
| F-14 | Student bulk import | Import student list from CSV/Excel (implemented) |
| F-15 | Print transaction receipt | Generate printable receipt for student |
| F-16 | Email notifications | Notify staff when documents are ready for release |
| F-17 | Dashboard charts | Visual charts for trends (daily/weekly/monthly) |
| F-18 | Mobile-responsive layout | Optimized for tablet use at service counter |

### V2 Features (implemented September 2026)

| ID | Feature | Description |
|---|---|---|
| V2-01 | Bulk actions | Select rows to Start Processing, Sign (admin) or Release several requests at once |
| V2-02 | One-claimant release | One representative signs once for many requests (e.g. a whole block) |
| V2-03 | Per-day dashboards | Dashboards show one day at a time, defaulting to today; date filter comes before status |
| V2-04 | Compact tables | Abbreviated programs, Actions beside Status, smaller dates, scrollbar above the table, pages in a menu |
| V2-05 | Enrolled Students directory | Total count, program filter, BU Email and Contact Number columns, pagination |
| V2-06 | Alumni requests | Alumni button on the request form; alumni kept out of roster deactivation |
| V2-07 | ARTA and BUP logbooks | Excel exports with the campus header, document sub-columns, captured signatures and totals |
| V2-08 | Audit log totals | Total count, Today view, Transaction ID column removed |
| V2-09 | Data Privacy consent | Claimant must tick a consent box before the signature is accepted |
| V2-10 | Tablet security | Sign page usable on one device only and only while staff are active |

### Out of Scope
- Student-facing portal or self-service
- Online payment processing
- Integration with external Student Information Systems (SIS)
- SMS notifications
- Multi-campus support

---

## 6. User Experience Requirements

### User Flows

**Flow 1: Encode New Request (Staff)**
```
Login → Staff Dashboard → New Request form →
Search student (or click "Alumni" to add an alumni requester) → Program & Year auto-fill →
Select document types (counter buttons: COR, COG, GMC, AUTH, OTR, Others) → Save →
Status = Pending, timestamps auto-recorded
```

**Flow 2: Start Processing (Staff)**
```
Staff Dashboard → select one or more Pending requests →
Start Processing → Status = Processing
```

**Flow 3: Review & Sign (Admin)**
```
Login → Admin Dashboard → select one or more Processing requests →
Sign → Status = Ready for Release, reviewer + timestamp recorded, duration calculated
```

**Flow 4: Release Document (Staff)**
```
Staff Dashboard → select one or more Ready for Release requests →
Enter claimant name → Sign on Tablet →
Claimant ticks Data Privacy consent and signs on the tablet →
Staff confirms → Status = Released (one signature for all selected requests)
```

### Information Architecture

```
├── Login Page
├── Signing Tablet (/sign — no login; one device only, active only while staff are active)
├── Menu (top-left) → pages below
├── Staff Dashboard
│   ├── Summary cards (selected day)
│   ├── New Request form (students + Alumni button)
│   └── Transactions (one day at a time; bulk Start Processing / Release)
├── Admin Dashboard
│   ├── Summary cards (selected day)
│   └── Requests (one day at a time; bulk Sign)
├── Students (Admin) — Enrolled Students directory, import
├── Reports (Admin) — ARTA-Logbook and BUP-Logbook Excel exports
├── Staff Management (Admin only)
├── Audit Log (Admin only)
└── Logout
```

### Performance Requirements
| Metric | Target |
|---|---|
| Page load time | < 2 seconds |
| Student autocomplete response | < 500ms |
| Report generation (30-day range) | < 5 seconds |
| Concurrent users supported | 10 (realistic max for single registrar office) |

---

## 7. Technical Considerations

### Platform
- **Web application** (browser-based), accessible on desktop and tablets
- Modern browsers: Chrome, Firefox, Edge (latest 2 versions)

### Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19 + TypeScript + Vite |
| **Backend** | Node.js + TypeScript + Fastify, Prisma ORM, Zod validation |
| **Database** | PostgreSQL (Supabase) |
| **Authentication** | JWT-based session tokens, bcrypt password hashing |
| **Styling** | Tailwind CSS, Radix UI |
| **Reports** | ExcelJS (xlsx generation) |
| **Deployment** | Vercel (static client + serverless API) |

### Data Model (Key Tables)

| Table | Key Fields |
|---|---|
| `User` | name, username, passwordHash, role (admin/staff), status (active/inactive), lastActiveAt |
| `Student` | studentNumber, lastName, firstName, middleName, email, sex, contactNumber, course, yearLevel, active, isAlumni |
| `Transaction` | studentId, student snapshot (name, course, year), docCOR, docCOG, docGMC, docAUTH, docOTR, others, othersCount, status, preparedBy/At, reviewedBy/At, duration, releasedTo, releasedAt, signature |
| `AuditLog` | transactionId, action, previousStatus, newStatus, performedBy, timestamp |
| `SigningSession` | transactionIds, token, releasedTo, liveSignature, status, consentAt |
| `TabletLock` | deviceId, lastSeenAt (single row: the registered signing tablet) |

### Security
- Passwords hashed with bcrypt (min 10 salt rounds)
- JWT tokens with expiration (30 min inactivity timeout)
- Role-based access control (RBAC) enforced on both frontend routes and backend endpoints
- Input validation and sanitization on all endpoints
- CORS restricted to known origins
- Rate limiting on login endpoint (prevent brute force)

### API Design (RESTful)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | Authenticate user |
| POST | `/api/auth/logout` | End session, clear staff activity |
| POST | `/api/auth/heartbeat` | Mark the user as active |
| GET | `/api/transactions` | List transactions (status, day, search filters) |
| POST | `/api/transactions` | Create new transaction |
| POST | `/api/transactions/bulk/start` | Start processing one or more requests (staff) |
| POST | `/api/transactions/bulk/sign` | Sign one or more requests (admin) |
| POST | `/api/transactions/bulk/release` | Release one or more requests with one signature (staff) |
| GET | `/api/students` | Search students (autocomplete) |
| GET | `/api/students/directory` | Enrolled student directory with total and program filter (admin) |
| POST | `/api/students` | Add a student or alumni requester |
| POST | `/api/students/bulk` | Import the student roster |
| GET | `/api/reports` | Report preview, or ARTA/BUP xlsx with `format=arta` / `format=bup` |
| GET | `/api/users` | List staff (admin) |
| POST | `/api/users` | Create staff account |
| PATCH | `/api/users/:id` | Update staff |
| GET | `/api/audit-logs` | View audit logs with total (admin) |
| POST | `/api/signing/sessions` | Send a release to the signing tablet (staff) |
| POST | `/api/signing/tablet/claim` | Register this device as the signing tablet |
| DELETE | `/api/signing/tablet/lock` | Reset the signing tablet |

The full list, including the tablet polling endpoints, is in [TECHNICAL_DESIGN.md](TECHNICAL_DESIGN.md#9-api-reference).

---

## 8. Launch Plan

### Phase 1: MVP
- Authentication (login, logout, session management)
- Student database (CRUD + autocomplete)
- Transaction encoding, status tracking, release flow
- Staff Dashboard (today's requests + incomplete items)

### Phase 2: Admin Features
- Admin Dashboard (all requests, filters, statistics)
- Summary Reports with ARTA/BUP Excel logbook export
- Staff Management (add, edit, deactivate, reset password)
- Audit Log

### Phase 3: Polish & Deploy
- UI/UX refinement
- Performance testing (50 concurrent requests)
- User acceptance testing with registrar staff
- Deployment to production environment
- Staff training session

### Training & Support
- 1-hour training session for all registrar staff
- Quick-reference guide (1-page cheat sheet)
- Admin guide for staff management and report generation

---

## 9. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Staff resist adopting digital system | Medium | High | Involve staff in testing; make UI simpler than manual process |
| Internet/network outage at campus | Medium | High | Consider local deployment or offline-capable fallback |
| Data loss (no backups) | Low | Critical | Automated daily database backups |
| Slow performance with growing data | Low | Medium | Index PostgreSQL queries; pagination on list views |
| Security breach (unauthorized access) | Low | High | RBAC, JWT expiration, bcrypt hashing, input validation |
| Scope creep during development | Medium | Medium | Strict adherence to MVP features; out-of-scope list enforced |

---

## 10. Validation Checklist

- [x] **Why** are we building this? → Replace manual logbook process with a digital system to reduce errors and improve efficiency
- [x] **Who** is it for? → Registrar staff and Admin at Bicol University Polangui
- [x] **What** does success look like? → 100% transaction digitization, auto-timestamps, on-demand reports
- [x] **What** features are included? → See Feature Requirements (F-01 through F-13)
- [x] **What** is out of scope? → Student portal, payments, SIS integration, SMS, multi-campus
- [x] **What** resources are needed? → Development team, PostgreSQL database (Supabase), Vercel hosting
- [x] **What** are the risks? → Adoption resistance, network outage, data loss — all mitigated

---

*This is a living document. Update as requirements evolve during development.*
