# Product Requirements Document (PRD)
## Registrar Transaction Management System
### Bicol University Polangui

| Field | Value |
|---|---|
| **Version** | 1.0 |
| **Date** | March 10, 2026 |
| **Status** | Draft |
| **Author** | — |

---

## 1. Executive Summary

### Problem Statement
The Office of the Registrar at Bicol University Polangui currently tracks document requests and service transactions through manual logbooks or spreadsheets. This process is slow, error-prone, and makes it difficult to generate reports, track processing duration, or identify bottlenecks. Staff have no reliable way to see which documents remain unclaimed, and the Registrar lacks visibility into daily workload and performance metrics.

### Solution Overview
A web-based **Registrar Transaction Management System (RTMS)** that digitizes the entire document request lifecycle — from encoding a student's request, through review/signing by the Registrar, to document release and claiming. The system automates timestamps, status tracking, duration calculation, and report generation.

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

Future State (RTMS):
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
| F-02 | Staff Dashboard | Must | Today's requests table + incomplete items list. Staff can only view their own requests — not other staff members' pending items. |
| F-03 | Transaction Encoding | Must | New request form with student autocomplete, document type counters, auto-timestamps |
| F-04 | Student Database | Must | Manual student entry (name, course, year level), autocomplete search, inline add |
| F-05 | Status Tracking | Must | Auto-status: Processing → Signed → Released |
| F-06 | Document Review/Signing | Must | Only the Registrar (Admin) can mark documents as reviewed/signed. Documents are always approved — no rejection flow. |
| F-07 | Document Release | Must | Record claimer name + signature, auto-timestamp. If the original staff is absent, the Admin releases on their behalf (Admin can see all requests). |
| F-08 | Duration Calculation | Must | Auto-calculate elapsed time from Prepared timestamp to Signed timestamp (calendar time). This measures how long the document waited for the Registrar's signature. |
| F-09 | Admin Dashboard | Must | All incomplete requests, filters, quick statistics |
| F-10 | Summary Reports | Must | By date range, service type, staff; export to CSV |
| F-11 | Staff Management | Must | Add, edit, deactivate, reset password |
| F-12 | Audit Log | Must | Log all status changes with user, timestamp, old/new status |
| F-13 | Logout + Session Timeout | Must | Logout button on all pages; 30-min inactivity timeout |

### Nice-to-Have (V2)

| ID | Feature | Description |
|---|---|---|
| F-14 | Student bulk import | Import student list from CSV/Excel |
| F-15 | Print transaction receipt | Generate printable receipt for student |
| F-16 | Email notifications | Notify staff when documents are ready for release |
| F-17 | Dashboard charts | Visual charts for trends (daily/weekly/monthly) |
| F-18 | Mobile-responsive layout | Optimized for tablet use at service counter |

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
Login → Staff Dashboard → Click "New Request" →
Select/Add Student (autocomplete) → Course & Year auto-fill →
Select document types (counter buttons) → Save →
Status = Processing, timestamps auto-recorded
```

**Flow 2: Review & Sign (Admin)**
```
Login → Admin Dashboard → View Processing requests →
Select request → Review → Mark as Signed →
Timestamp auto-recorded
```

**Flow 3: Release Document (Staff)**
```
Staff Dashboard → Incomplete Documents tab →
Select signed request → Enter claimer name → Capture signature →
Save → Status = Released, duration auto-calculated
```

### Information Architecture

```
├── Login Page
├── Staff Dashboard
│   ├── Today's Requests (table + new request form)
│   └── Incomplete/Unclaimed Documents
├── Admin Dashboard
│   ├── All Incomplete/Unreleased Requests (filterable)
│   ├── Quick Statistics
│   └── Summary Reports (with date range + export)
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
| **Frontend** | React + TypeScript + Vite |
| **Backend** | Node.js + TypeScript + Fastify |
| **Database** | MongoDB |
| **Authentication** | JWT-based session tokens |
| **Styling** | TBD (Tailwind CSS, shadcn/ui, or similar) |
| **Deployment** | TBD |

### Data Model (Key Collections)

| Collection | Key Fields |
|---|---|
| `users` | name, username, passwordHash, role (admin/staff), status (active/inactive) |
| `students` | name, course, yearLevel, createdAt |
| `transactions` | studentId, requestedDocuments, status, preparedBy, preparedAt, reviewedBy, reviewedAt, releasedTo, releasedAt, signature, duration |
| `auditLogs` | transactionId, action, previousStatus, newStatus, performedBy, timestamp |

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
| POST | `/api/auth/logout` | Invalidate session |
| GET | `/api/transactions` | List transactions (with filters) |
| POST | `/api/transactions` | Create new transaction |
| PATCH | `/api/transactions/:id/sign` | Mark as signed |
| PATCH | `/api/transactions/:id/release` | Mark as released |
| GET | `/api/students` | Search students (autocomplete) |
| POST | `/api/students` | Add new student |
| GET | `/api/reports` | Generate summary report |
| GET | `/api/users` | List staff (admin) |
| POST | `/api/users` | Create staff account |
| PATCH | `/api/users/:id` | Update staff |
| GET | `/api/audit-logs` | View audit logs (admin) |

---

## 8. Launch Plan

### Phase 1: MVP
- Authentication (login, logout, session management)
- Student database (CRUD + autocomplete)
- Transaction encoding, status tracking, release flow
- Staff Dashboard (today's requests + incomplete items)

### Phase 2: Admin Features
- Admin Dashboard (all requests, filters, statistics)
- Summary Reports with CSV export
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
| Slow performance with growing data | Low | Medium | Index MongoDB queries; pagination on all list views |
| Security breach (unauthorized access) | Low | High | RBAC, JWT expiration, bcrypt hashing, input validation |
| Scope creep during development | Medium | Medium | Strict adherence to MVP features; out-of-scope list enforced |

---

## 10. Validation Checklist

- [x] **Why** are we building this? → Replace manual logbook process with a digital system to reduce errors and improve efficiency
- [x] **Who** is it for? → Registrar staff and Admin at Bicol University Polangui
- [x] **What** does success look like? → 100% transaction digitization, auto-timestamps, on-demand reports
- [x] **What** features are included? → See Feature Requirements (F-01 through F-13)
- [x] **What** is out of scope? → Student portal, payments, SIS integration, SMS, multi-campus
- [x] **What** resources are needed? → Development team, MongoDB instance, web server
- [x] **What** are the risks? → Adoption resistance, network outage, data loss — all mitigated

---

*This is a living document. Update as requirements evolve during development.*
