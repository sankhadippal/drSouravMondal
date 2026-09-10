# Sourav Homoeopathic Clinic — Web Application

**Dr. Sourav Kumar Mondal, B.H.M.S. (WBUHS)**
Full-stack doctor portfolio, chamber management, online appointment booking, blog, and admin panel.

---

## Live URLs (Development)

| Service | URL |
|---|---|
| 🌐 Public Website | http://localhost:3000 |
| 🔐 Admin Panel | http://localhost:3000/admin/login |
| ⚙️ Backend API | http://localhost:5000 |
| ❤️ API Health | http://localhost:5000/health |

**Default Admin Login**
```
Email:    admin@souravhomoeopathic.com
Password: Admin@12345
```
> Change this immediately after first login.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Tailwind CSS, Vite |
| State | Zustand |
| Forms | React Hook Form |
| Charts | Recharts |
| PDF | jsPDF + jspdf-autotable |
| Backend | Node.js, Express.js, TypeScript |
| Database | PostgreSQL (SQLite auto-fallback for dev) |
| Auth | JWT (access + refresh tokens) |
| Payments | Razorpay |
| Email | Nodemailer (SMTP) |
| SMS/OTP | Fast2SMS / MSG91 |
| Scheduling | node-cron |

---

## Project Structure

```
DrSouravMondal/
├── frontend/                        # React + Vite frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/              # Navbar, Footer, PublicLayout, AdminLayout
│   │   │   └── ui/                  # LoadingSpinner, Badge, Modal, Pagination, etc.
│   │   ├── pages/
│   │   │   ├── public/              # Home, About, Services, Chambers, Blog, FAQ, Contact
│   │   │   │   └── legal/           # PrivacyPolicy, TermsConditions, CancellationPolicy
│   │   │   ├── booking/             # 7-step appointment booking flow + Confirmation
│   │   │   │   └── steps/           # Step1–Step7 components
│   │   │   └── admin/               # Dashboard, DoctorProfile, Chambers, Schedules,
│   │   │                            # Appointments, Patients, Payments, Blog, Settings, etc.
│   │   ├── services/api.ts          # Axios API layer (all endpoints)
│   │   ├── store/authStore.ts       # Zustand auth store
│   │   ├── hooks/                   # useVisitorTracking, useApi
│   │   ├── types/index.ts           # All TypeScript interfaces
│   │   └── utils/
│   │       ├── index.ts             # formatDate, formatTime, formatCurrency, etc.
│   │       └── pdfReceipt.ts        # jsPDF appointment receipt generator
│   └── public/
│
├── backend/                         # Express + TypeScript backend
│   ├── src/
│   │   ├── routes/                  # auth, doctor, chambers, schedules, blocked-dates,
│   │   │                            # services, otp, availability, appointments, patients,
│   │   │                            # payments, visitors, contact, notifications, faqs,
│   │   │                            # settings, audit-logs, users, export, blogs
│   │   ├── middleware/              # auth, validate, rateLimiter, errorHandler
│   │   ├── services/cronJobs.ts     # Slot release, reminders, OTP cleanup, no-show
│   │   ├── utils/                   # jwt, otp, email, sms, auditLog, appointmentNumber
│   │   ├── config/
│   │   │   ├── db.ts                # PostgreSQL + SQLite auto-fallback adapter
│   │   │   └── sqliteAdapter.ts     # Pure-JS SQLite for zero-install dev
│   │   └── types/index.ts
│   ├── migrations/
│   │   ├── 001_initial_schema.sql   # All 18 core tables
│   │   ├── 002_blogs.sql            # Blog posts table
│   │   ├── run.ts                   # Migration runner
│   │   └── seed.ts                  # Initial data (admin, chambers, FAQs, settings)
│   └── uploads/                     # Blog cover images, doctor photos
│
├── package.json                     # Root workspace scripts
└── README.md
```

---

## Quick Start

### 1. Install dependencies
```bash
# From project root
cd backend  && npm install
cd ../frontend && npm install
```

### 2. Configure environment
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```
Edit `backend/.env` with your values (see Environment Variables section below).

### 3. Database setup

**Option A — Free cloud PostgreSQL (easiest, no install)**
1. Sign up at [neon.tech](https://neon.tech) → create a project → copy connection string
2. In `backend/.env`:
   ```
   DATABASE_URL=postgresql://user:pass@host/db
   DB_SSL=true
   ```

**Option B — Local PostgreSQL**
```sql
CREATE DATABASE sourav_homoeopathic;
```
Update `DB_PASSWORD` in `backend/.env`.

**Run migrations + seed:**
```bash
cd backend
npm run migrate   # creates all tables
npm run seed      # seeds chambers, FAQs, services, admin account
```

### 4. Start servers
```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

> **No PostgreSQL?** The backend auto-detects when PostgreSQL is unavailable and falls back to SQLite automatically. The full app works for development with zero database installation.

---

## Environment Variables

### `backend/.env`

```env
# Server
NODE_ENV=development
PORT=5000
APP_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000

# Database (PostgreSQL)
DATABASE_URL=postgresql://postgres:password@localhost:5432/sourav_homoeopathic
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sourav_homoeopathic
DB_USER=postgres
DB_PASSWORD=your_password
DB_SSL=false

# JWT
JWT_SECRET=your_32+_char_secret_here
JWT_REFRESH_SECRET=another_32+_char_secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Razorpay
RAZORPAY_KEY_ID=rzp_test_TX51n3p2IzriVt
RAZORPAY_KEY_SECRET=XC00XFLRqnc9a9Xm8nkwpAo3
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# Google Maps (optional)
GOOGLE_MAPS_API_KEY=your_google_maps_key

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM_NAME=Sourav Homoeopathic Clinic
SMTP_FROM_EMAIL=noreply@souravhomoeopathic.com

# SMS OTP (Fast2SMS)
SMS_PROVIDER=fast2sms
SMS_API_KEY=your_sms_api_key
SMS_SENDER_ID=SOUHOM

# OTP Settings
OTP_EXPIRY_MINUTES=10
OTP_MAX_ATTEMPTS=3
OTP_RESEND_COOLDOWN_MINUTES=2

# Initial admin
ADMIN_EMAIL=admin@souravhomoeopathic.com
ADMIN_PASSWORD=Admin@12345
```

### `frontend/.env`

```env
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key
```

---

## Public Website Pages

| Route | Page |
|---|---|
| `/` | Home — hero, services, chambers, CTA |
| `/about` | Doctor profile, qualifications, expertise |
| `/services` | Treatments & specializations |
| `/chambers` | Chamber locations with maps & schedules |
| `/online-consultation` | Online consultation info & booking |
| `/appointment` | 7-step appointment booking flow |
| `/appointment/confirmation/:id` | Booking confirmation + PDF receipt |
| `/blog` | Blog listing |
| `/blog/:slug` | Individual blog post |
| `/faq` | Frequently asked questions |
| `/contact` | Contact form |
| `/privacy-policy` | Privacy Policy |
| `/terms-conditions` | Terms & Conditions |
| `/cancellation-policy` | Cancellation & Refund Policy |

---

## Admin Panel Pages

| Route | Page |
|---|---|
| `/admin/dashboard` | Stats, charts (Recharts), quick links |
| `/admin/doctor-profile` | Edit doctor name, bio, qualifications, etc. |
| `/admin/services` | Add/edit/delete services |
| `/admin/chambers` | Chamber CRUD |
| `/admin/schedules` | Weekly schedule per chamber |
| `/admin/blocked-dates` | Holiday / closure management |
| `/admin/appointments` | Full table with search, filter, status update |
| `/admin/patients` | Patient list + appointment history |
| `/admin/payments` | Payment table, stats, refund initiation |
| `/admin/visitors` | Website analytics (privacy-safe) |
| `/admin/messages` | Contact form submissions |
| `/admin/notifications` | Email/SMS notification queue |
| `/admin/faqs` | FAQ CRUD |
| `/admin/blogs` | Blog post editor with image upload |
| `/admin/settings` | Site-wide settings (general, appointment, SEO) |
| `/admin/users` | Admin user management (RBAC) |
| `/admin/audit-logs` | Admin action audit trail |

---

## Appointment Booking Flow (7 Steps)

```
Step 1 → Choose consultation type (Online / Chamber)
Step 2 → Select chamber location (if chamber)
Step 3 → Pick date (calendar with available dates highlighted)
Step 4 → Pick time slot (greyed = booked)
Step 5 → Enter patient information
Step 6 → OTP verification (SMS or Email)
Step 7 → Payment (Razorpay / Demo mode)
       → Confirmation page with PDF receipt download & print
```

### Razorpay Test Cards
| Type | Details |
|---|---|
| Card (success) | `4111 1111 1111 1111` · any future expiry · any CVV |
| UPI (success) | `success@razorpay` |
| Card (failure) | `4000 0000 0000 0002` |

---

## API Overview

### Auth
```
POST /api/auth/login          — Admin login → JWT
POST /api/auth/logout         — Logout
POST /api/auth/refresh        — Refresh access token
GET  /api/auth/me             — Current user
PUT  /api/auth/change-password
```

### Public
```
GET  /api/doctor              — Doctor profile
GET  /api/chambers            — Active chambers with schedules
GET  /api/services            — Active services
GET  /api/faqs                — Published FAQs
GET  /api/settings            — Public site settings
GET  /api/blogs               — Published blog posts
GET  /api/blogs/:slug         — Single blog post
GET  /api/availability/dates  — Available booking dates for a month
GET  /api/availability        — Available time slots for a date
POST /api/otp/send            — Send OTP (mobile or email)
POST /api/otp/verify          — Verify OTP
POST /api/appointments        — Create appointment (after OTP)
GET  /api/appointments/confirm/:number — Public confirmation view
POST /api/payments/create-order  — Create Razorpay order
POST /api/payments/verify        — Verify Razorpay payment signature
POST /api/payments/demo-confirm  — Dev-mode payment (no Razorpay keys needed)
POST /api/payments/webhook       — Razorpay webhook
POST /api/contact             — Contact form submission
POST /api/visitors/track      — Privacy-safe visit tracking
```

### Admin (require Bearer token)
```
GET/PUT  /api/doctor                              — Manage doctor profile
GET/POST /api/chambers + /api/chambers/admin/all  — Chamber CRUD
GET/PUT  /api/schedules/:chamberId                — Weekly schedule
GET/POST/DELETE /api/blocked-dates               — Holidays / closures
GET/POST/PUT/DELETE /api/services                — Services CRUD
GET/POST/PUT/DELETE /api/blogs + /admin/*        — Blog CRUD
GET  /api/appointments/admin                     — Appointment list
PUT  /api/appointments/admin/:id                 — Update status
GET  /api/appointments/admin/stats/dashboard     — Dashboard stats
GET  /api/appointments/admin/charts              — Chart data
GET  /api/appointments/admin/calendar            — Calendar view
GET  /api/patients + /:id                        — Patient management
GET  /api/payments/admin                         — Payment list
GET  /api/payments/admin/stats                   — Revenue stats
POST /api/payments/refund/:id                    — Initiate refund
GET  /api/visitors                               — Visitor analytics
GET  /api/contact                                — Contact messages
GET  /api/notifications                          — Notification queue
GET  /api/settings/admin  PUT /api/settings      — Settings management
GET  /api/users + CRUD                           — Admin user management
GET  /api/audit-logs                             — Audit trail
GET  /api/export/appointments                    — CSV export
GET  /api/export/patients                        — CSV export
GET  /api/export/payments                        — CSV export
GET  /api/export/revenue-report                  — CSV export
```

---

## Database Tables (PostgreSQL)

| Table | Purpose |
|---|---|
| `users` | Admin accounts (super_admin, doctor, staff) |
| `doctor_profiles` | Public doctor profile content |
| `services` | Treatment/specialization list |
| `chambers` | Chamber locations |
| `chamber_schedules` | Weekly availability per chamber |
| `blocked_dates` | Holidays & closures |
| `patients` | Patient records |
| `appointments` | Appointment bookings |
| `appointment_history` | Status change log |
| `payments` | Razorpay payment records |
| `refunds` | Refund tracking |
| `otp_verifications` | OTP records (bcrypt-hashed) |
| `blog_posts` | Blog articles with cover images |
| `website_visitors` | Privacy-safe visit analytics |
| `contact_messages` | Contact form submissions |
| `notifications` | Email/SMS notification queue |
| `faqs` | FAQ entries |
| `website_settings` | Key-value site settings |
| `audit_logs` | Admin action audit trail |
| `schema_migrations` | Migration tracking |

---

## Razorpay Integration

Test keys are pre-configured in `backend/.env`:
```
RAZORPAY_KEY_ID=rzp_test_TX51n3p2IzriVt
RAZORPAY_KEY_SECRET=XC00XFLRqnc9a9Xm8nkwpAo3
```

**Payment flow:**
1. Patient completes booking + OTP verification
2. Frontend calls `POST /api/payments/create-order` → gets Razorpay order ID
3. Razorpay checkout opens in browser
4. On success, frontend calls `POST /api/payments/verify` with signature
5. Backend verifies signature cryptographically → confirms appointment
6. Confirmation page shown with PDF receipt

**Demo mode:** When no real Razorpay keys are configured, a "Demo Pay" button appears that confirms the appointment without payment processing (dev/test only, disabled in production).

**Refunds:** Admin can initiate refunds from the Payments page. Real Razorpay refunds are attempted; if the payment is a demo/test payment, a local refund record is created instead.

---

## OTP Integration

| Mode | Behavior |
|---|---|
| Dev (no SMS key) | OTP logged to console + returned in API response for testing |
| Production (Fast2SMS) | Real SMS sent to mobile number |
| Email | SMTP email with OTP (requires SMTP config) |

**Security:** OTPs are bcrypt-hashed, expire in 10 minutes, max 3 wrong attempts, 2-minute resend cooldown.

---

## Blog System

- Admin creates posts at `/admin/blogs` with rich text content and cover image upload
- Supports Markdown-like formatting: `**bold**`, `*italic*`, `## heading`, `> blockquote`
- Draft / Published workflow
- Public at `/blog` (grid view) and `/blog/:slug` (detail view)
- View counter, tag filtering, SEO meta fields
- Cover images stored in `backend/uploads/blog/`

---

## PDF Receipt

Clicking **"Download PDF"** or **"Print Receipt"** on the confirmation page generates a professional A4 receipt using jsPDF:
- Clinic header with teal branding
- Patient & appointment details (two-column layout)
- Chamber location (if chamber visit)
- Payment summary table
- Important instructions
- Clinic footer

Print mode opens a new browser tab showing only the PDF (not the full webpage).

---

## Security

- JWT access tokens (15 min) + refresh tokens (7 days)
- bcrypt password hashing (cost 12)
- OTPs stored as bcrypt hashes
- UUID validation on all chamber/user IDs (rejects stale SQLite-era IDs)
- Rate limiting: general (5000 req/15 min dev, 300 prod), auth (10/15 min), OTP (5/10 min)
- CORS restricted to configured `FRONTEND_URL`
- Helmet.js security headers
- Razorpay signature verification (HMAC-SHA256) before confirming any payment
- Audit log for all admin actions
- Role-based access: `super_admin` > `doctor` > `staff`

---

## Production Deployment

### Frontend → Vercel
```bash
cd frontend
npm run build
npx vercel --prod
```
Add `vercel.json` (already included) for SPA routing.

### Backend → Render / Railway
- Build: `cd backend && npm install && npm run build`
- Start: `cd backend && npm start`
- Add all env vars from `backend/.env`

### Database → Neon / Supabase / Railway PostgreSQL
Set `DATABASE_URL` and `DB_SSL=true` in backend env.

### After deploying backend
```bash
npm run migrate
npm run seed
```

---

## Chambers

| Chamber | Location |
|---|---|
| Kolkata (Dhakuria) | Dhakuria, Kolkata — ₹400/consultation |
| Mechogram | Mechogram, West Bengal — ₹300 |
| Debra | Debra, West Bengal — ₹300 |
| Fuleswar | Fuleswar, West Bengal — ₹300 |

---

## Support

- **Phone / WhatsApp:** 7810880949
- **Email:** drsouravkumarmondal@gmail.com
- **Trained under:** Dr. Prasanta Banerji, Elgin Road, Kolkata

---

*Sourav Homoeopathic Clinic — Dr. Sourav Kumar Mondal, B.H.M.S. (WBUHS)*
#   d r S o u r a v M o n d a l  
 