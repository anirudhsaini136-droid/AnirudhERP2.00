# Module Parity Matrix (Web vs Android vs Windows)

## Roles
- `super_admin`
- `business_owner`
- `hr_admin`
- `finance_admin`
- `inventory_admin`
- `ca_admin`
- `staff`

## Status Legend
- `P0`: Must-have for first production release
- `P1`: Required before broad rollout
- `P2`: Nice-to-have polish

## Route/Module Matrix

| Module | Route | Roles | Android | Windows | Priority | Acceptance |
|---|---|---|---|---|---|---|
| Login/Signup/Reset | `/login`, `/signup`, `/reset-password` | all | Planned | Planned | P0 | Auth, refresh token, logout, session recovery |
| Public Invoice | `/invoice/:id` | public | Planned | Planned | P1 | Render invoice + QR/pay links |
| Super Admin Dashboard | `/super-admin` | super_admin | Planned | Planned | P1 | KPIs + navigation |
| Super Admin Businesses | `/super-admin/businesses` | super_admin | Planned | Planned | P1 | list/filter/open business detail |
| Super Admin Business Detail | `/super-admin/businesses/:id` | super_admin | Planned | Planned | P1 | open, edit controls, impersonate |
| Platform Settings | `/super-admin/settings` | super_admin | Planned | Planned | P1 | save and reload settings |
| Business Dashboard | `/dashboard` | business_owner | Planned | Planned | P0 | alerts, KPI cards, nav links |
| User Management | `/dashboard/users` | business_owner | Planned | Planned | P1 | list/create/deactivate users |
| Business Settings | `/dashboard/settings` | business_owner | Planned | Planned | P0 | invoice, bank, WhatsApp API save |
| HR Dashboard | `/hr` | hr_admin, business_owner | Planned | Planned | P1 | summary cards and quick actions |
| Employees | `/hr/employees` | hr_admin, business_owner | Planned | Planned | P1 | CRUD + filters |
| Attendance | `/hr/attendance` | hr_admin, business_owner | Planned | Planned | P1 | mark/list/export |
| Leave | `/hr/leave` | hr_admin, business_owner | Planned | Planned | P1 | apply/approve/deny lifecycle |
| Payroll | `/hr/payroll` | hr_admin, business_owner | Planned | Planned | P1 | run payroll + payslip visibility |
| Finance Dashboard | `/finance` | finance_admin, business_owner, ca_admin | Planned | Planned | P0 | revenue/outstanding/overdue cards |
| Invoices List | `/finance/invoices` | finance_admin, business_owner, ca_admin | Planned | Planned | P0 | list, search, status, multi-select |
| Invoice View | `/finance/invoices/:id` | finance_admin, business_owner, ca_admin | Planned | Planned | P0 | print/share/whatsapp actions |
| Expenses | `/finance/expenses` | finance_admin, business_owner | Planned | Planned | P1 | create/review/list |
| Reports | `/finance/reports` | finance_admin, business_owner | Planned | Planned | P1 | profit-loss + invoice aging |
| GST Reports | `/finance/gst` | finance_admin, business_owner, ca_admin | Planned | Planned | P0 | server + offline pending merge |
| Purchases | `/purchases` | finance_admin, business_owner, inventory_admin, ca_admin | Planned | Planned | P1 | bills + ITC flow |
| CA Portal | `/ca` | ca_admin, business_owner, finance_admin | Planned | Planned | P1 | GST + accounting read views |
| Accounting | `/accounting` | finance_admin, business_owner, ca_admin | Planned | Planned | P1 | TB/PL/BS views |
| Customer Ledger | `/finance/customers` | finance_admin, business_owner | Planned | Planned | P1 | list and detail |
| Customer Ledger Detail | `/finance/customers/:clientName` | finance_admin, business_owner | Planned | Planned | P1 | reminders + bulk payment |
| Data Migration | `/finance/migration` | finance_admin, business_owner | Planned | Planned | P2 | import flow UI |
| Inventory | `/inventory` | inventory_admin, business_owner | Planned | Planned | P0 | product list + stock movement |
| Quick Bill | `/inventory/billing` | inventory_admin, business_owner | Planned | Planned | P1 | billing flow + stock effects |
| Staff Home | `/staff` | staff | Planned | Planned | P1 | self-service summary |
| Staff Attendance | `/staff/attendance` | staff | Planned | Planned | P1 | check-in/check-out/history |
| Staff Leave | `/staff/leave` | staff | Planned | Planned | P1 | apply and status tracking |
| Staff Payslips | `/staff/payslips` | staff | Planned | Planned | P1 | list + download |
| Staff Profile | `/staff/profile` | staff | Planned | Planned | P2 | profile edit |

## Cross-cutting parity requirements
- Role-gated navigation must match web behavior.
- Offline invoice/payment queue parity must match current web behavior.
- GST totals must include offline pending invoices in app reports.
- Stock deduction/restore logic must remain backend-authoritative.
- WhatsApp reminder modes:
  - web deep-link fallback
  - API mode when credentials are set.

## Validation checklist per module
1. Open screen and load data.
2. Create/update/delete actions (if role allows).
3. Offline behavior (if module supports offline).
4. Sync recovery after reconnect.
5. Error handling and retry.
6. Export/print/share where applicable.

