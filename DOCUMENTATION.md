# Financial Control Panel - Complete Documentation

## Table of Contents
1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [Setup & Installation](#setup--installation)
4. [Deployment Guide](#deployment-guide)
5. [Environment Configuration](#environment-configuration)
6. [Database & Prisma](#database--prisma)
7. [Authentication & Security](#authentication--security)
8. [Real-time Features](#real-time-features)
9. [Features & API](#features--api)
10. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Git
- Supabase account
- Vercel account (for deployment)

### Local Development
```bash
# Clone repository
git clone <repo-url>
cd financial-control-panel

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your credentials

# Setup database
npm run db:generate
npm run db:push

# Start dev server
npm run dev
```

Visit `http://localhost:3000` (or 3001 if 3000 is in use)

---

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 14.2 (App Router, React Server Components)
- **Database**: Supabase PostgreSQL via Prisma ORM
- **Auth**: NextAuth.js with custom JWT
- **Real-time**: Socket.IO (local dev only; Vercel uses polling)
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI + custom components
- **File Upload**: UploadThing
- **PDF Generation**: pdf-lib
- **Payment**: M-Pesa integration

### Key Architectural Patterns

#### Budget System (Item-Driven)
- `BudgetItem` rows are authoritative
- `Budget.amount` = sum of all items
- Users create budgets (status: PENDING)
- Admins approve/reject/request revisions
- When revision requested, `BudgetRevision` record created

#### Expenditure Tracking
- Users submit `ExpenditureItem` with `spentAmount`
- If `spentAmount` > budget item price → auto-create `SupplementaryBudget` (PENDING)
- Server validates budget ownership before creating expenditures

#### Fund Pool Management
- Admins manage `SystemSetting` key `fund_pool_balance`
- Users submit `Remittance` records with proof (file upload)
- Admins verify and credit pool
- All via Prisma transactions for consistency

#### Role Enforcement
- **ADMIN**: Email = `admin@financialpanel.com`
- **USER**: All other emails
- Roles derived from email, NOT stored in DB
- Middleware enforces access control on all dashboard routes

---

## Setup & Installation

### 1. Local Environment Setup

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Edit .env.local and fill in:
# - DATABASE_URL (Supabase PostgreSQL connection string)
# - Supabase keys
# - NextAuth secret (generate: openssl rand -base64 32)
# - M-Pesa credentials (if using payment)
# - UploadThing credentials
```

### 2. Database Connection

```bash
# Get your Supabase Database URL from:
# https://app.supabase.com → Settings → Database → Connection String

# Format should be:
# postgresql://postgres:[password]@[host]:5432/postgres

# Update in .env.local:
DATABASE_URL="postgresql://postgres:YOUR-PASSWORD@YOUR-HOST:5432/postgres"
```

### 3. Prisma Setup

```bash
# Generate Prisma client
npm run db:generate

# Test connection via Prisma Studio
npm run db:studio

# Push schema to database
npm run db:push

# (Optional) Seed test data
npm run db:seed
```

### 4. Development Server

```bash
npm run dev
# Opens on http://localhost:3000 (or 3001 if port taken)
```

---

## Deployment Guide

### Deploy to Vercel

1. **Create GitHub Repository**
   ```bash
   git add .
   git commit -m "Initial commit: Production-ready Financial Control Panel"
   git push -u origin main
   ```

2. **Create Vercel Deployment**
   - Go to https://vercel.com/new
   - Click "Import Git Repository"
   - Select your GitHub repo
   - Click "Deploy"

3. **Add Environment Variables in Vercel**
   - Settings → Environment Variables
   - Add all variables from `.env.example` (see below)

4. **Configure M-Pesa Callbacks** (if using payments)
   - In Safaricom M-Pesa developer console
   - Set Callback URL: `https://financial-control-panel.vercel.app/api/webhooks/mpesa`

### Production Domain

Your domain is: **https://financial-control-panel.vercel.app**

Update the following environment variables:
- `NEXTAUTH_URL=https://financial-control-panel.vercel.app`
- `APP_URL=https://financial-control-panel.vercel.app`
- `MPESA_CALLBACK_URL=https://financial-control-panel.vercel.app/api/webhooks/mpesa`
- `NEXT_PUBLIC_SOCKET_URL=https://financial-control-panel.vercel.app` (commented out; polling used)

---

## Environment Configuration

### Required Variables for Local Development

```env
# Database (Supabase)
DATABASE_URL="postgresql://postgres:PASSWORD@HOST:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://PROJECT-ID.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="YOUR-ANON-KEY"
SUPABASE_SERVICE_ROLE_KEY="YOUR-SERVICE-ROLE-KEY"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="openssl rand -base64 32"  # Generate with: openssl rand -base64 32

# M-Pesa (Safaricom)
MPESA_CONSUMER_KEY="YOUR-MPESA-KEY"
MPESA_CONSUMER_SECRET="YOUR-MPESA-SECRET"
MPESA_PASSKEY="YOUR-MPESA-PASSKEY"
MPESA_SHORTCODE="174379"
MPESA_CALLBACK_URL="http://localhost:3000/api/webhooks/mpesa"

# UploadThing
UPLOADTHING_SECRET="YOUR-UPLOADTHING-SECRET"
UPLOADTHING_APP_ID="YOUR-UPLOADTHING-APP-ID"

# App Config
APP_URL="http://localhost:3000"
JWT_SECRET="openssl rand -base64 32"
NEXT_PUBLIC_SOCKET_URL="http://localhost:3000"
```

### Production Variables (.env.production)

Replace placeholders with actual values:
- `[YOUR-VERCEL-DOMAIN]` → `financial-control-panel.vercel.app`
- `[YOUR-MPESA-KEY]`, `[YOUR-MPESA-SECRET]`, etc. → actual values
- All other production-specific URLs

**Important**: `.env.production` is in `.gitignore` for security. Set these directly in Vercel dashboard.

---

## Database & Prisma

### Core Models

**User**
- Stores authentication and user data
- Role derived from email (admin@financialpanel.com → ADMIN)
- Relations: budgets, expenditures, projects, transactions, votes, audit logs, reports

**Budget**
- Created by users (status: PENDING)
- Items stored in `BudgetItem` (authoritative source)
- `Budget.amount` = sum of all items
- Admin approval workflow with `approvedBy` and `approvedAt`
- Revisions tracked via `BudgetRevision`

**BudgetItem**
- Individual line items in a budget
- Contains: name, unitPrice, quantity, total
- Linked to budget and creator

**Expenditure**
- User submits expenditures against budgets
- Items stored in `ExpenditureItem`
- Status: PENDING, APPROVED, REJECTED

**SupplementaryBudget**
- Auto-created when `ExpenditureItem.spentAmount` > `BudgetItem.unitPrice`
- Status: PENDING (requires admin approval)

**Project**
- Collaborative projects with voting
- Users vote on project approval
- Linked to budgets

**Transaction**
- Records all financial movements
- Audit trail for fund pool management

**Report**
- Generated admin reports
- Stored as PDF in `public/reports/`
- Downloadable via `/api/reports/[id]/download`

### Common Prisma Operations

```typescript
// Use singleton from lib/prisma.ts
import { prisma } from '@/lib/prisma'

// Simple query
const user = await prisma.user.findUnique({ where: { id: userId } })

// With relations
const budget = await prisma.budget.findUnique({
  where: { id: budgetId },
  include: { user: true, items: true, approvedBy: true }
})

// Multi-step transaction
await prisma.$transaction(async (tx) => {
  const budget = await tx.budget.findUnique({ where: { id: budgetId } })
  const expenditure = await tx.expenditure.create({ data: {...} })
  if (expenditure.amount > budget.allocatedAmount) {
    await tx.supplementaryBudget.create({ data: {...} })
  }
})
```

### Email Normalization

**Critical Pattern**: All email comparisons must be case-insensitive:
```typescript
// CORRECT
const email = (inputEmail ?? '').toLowerCase()
const user = await prisma.user.findFirst({
  where: { email: { equals: email, mode: 'insensitive' } }
})

// WRONG - will fail in production
const user = await prisma.user.findUnique({ where: { email: inputEmail } })
```

---

## Authentication & Security

### NextAuth Setup

Configured in `lib/auth.ts`:
- Custom credentials provider with bcrypt password hashing
- JWT-based sessions with custom claims (role, isApproved)
- Role assignment based on email in JWT callback
- Prisma adapter for session/account storage

### Key Files
- `lib/auth.ts` - NextAuth configuration
- `middleware.ts` - Route protection and role enforcement
- `types/next-auth.d.ts` - Session type definitions

### Middleware Enforcement

Routes protected by middleware.ts:
- `/dashboard/admin/*` - Requires ADMIN role
- `/dashboard/user/*` - Requires USER role + `isApproved=true`
- `/dashboard/pending-approval` - Shown to non-approved users

Non-approved users cannot access dashboard (redirected to pending-approval page).

### Password Security

```typescript
import bcryptjs from 'bcryptjs'

// Hash on registration
const hashedPassword = await bcryptjs.hash(plainPassword, 10)

// Compare on login
const isValid = await bcryptjs.compare(plainPassword, hashedPassword)
```

---

## Real-time Features

### Socket.IO Architecture

**Server**: `lib/realtime.ts`
- Initialized on first request via `pages/api/socket.ts`
- Room conventions:
  - `user-<id>` - per-user notifications
  - `admin-room` - admin-only broadcasts

**Client**: `components/providers/SocketProvider.tsx`
- Auto-disabled on production (Vercel doesn't support localhost)
- Falls back to polling via React Query

### Emitting Events

```typescript
import { getIO } from '@/lib/realtime'

// Broadcast to user
getIO().to(`user-${userId}`).emit('budget-updated', {
  budgetId,
  newAmount,
  status
})

// Broadcast to all admins
getIO().to('admin-room').emit('new-expenditure', {
  expenditureId,
  amount
})
```

### Listening (Client)

```typescript
// In client components with useEffect
useEffect(() => {
  if (!socket?.connected) return
  
  socket.on('budget-updated', (data) => {
    // Update local state or refetch
    queryClient.invalidateQueries({ queryKey: ['budgets'] })
  })
  
  return () => socket.off('budget-updated')
}, [socket])
```

### Production Polling

On Vercel (production), Socket.IO is disabled. App uses React Query polling:
```typescript
const { data } = useQuery({
  queryKey: ['budgets'],
  queryFn: () => fetch('/api/budgets').then(r => r.json()),
  refetchInterval: 5000 // Poll every 5 seconds
})
```

---

## Features & API

### Budget Workflow

1. **User Creates Budget**
   - POST `/api/budgets` with items
   - Status: PENDING
   - Admin notified

2. **Admin Reviews**
   - GET `/api/budgets?status=PENDING`
   - POST `/api/budgets/[id]/approve` - Approves with `approvedBy` + `approvedAt`
   - POST `/api/budgets/[id]/reject` - Rejects with reason
   - POST `/api/budgets/[id]/request-revision` - Creates `BudgetRevision`, status: REVISION_REQUESTED

3. **User Revises** (if requested)
   - PUT `/api/budgets/[id]` - Updates budget items
   - Status changes back to PENDING
   - Admin notified again

### Expenditure Workflow

1. **User Submits Expenditure**
   - POST `/api/expenditures` with items
   - Server validates budget availability
   - If overspend → auto-create SupplementaryBudget (PENDING)

2. **Supplementary Approval**
   - Admin approves/rejects SupplementaryBudget
   - Updates available budget allocation

### Fund Pool Management

1. **Admin Adjusts Pool**
   - POST `/api/fund-pool/adjust`
   - Updates `SystemSetting` key `fund_pool_balance`

2. **User Submits Remittance**
   - POST `/api/remittances` with proof file
   - Status: PENDING
   - Admin notified

3. **Admin Verifies**
   - POST `/api/remittances/[id]/verify`
   - Credits pool balance
   - Creates audit log

### Report Generation

1. **Generate Report**
   - POST `/api/reports/generate` with type (MONTHLY/QUARTERLY/YEARLY)
   - Creates PDF using pdf-lib
   - Stores in `public/reports/report-<timestamp>.pdf`
   - Persists `Report` record in DB
   - Returns `downloadUrl`

2. **Download Report**
   - GET `/api/reports/[id]/download`
   - Returns PDF as attachment

---

## Code Organization

```
/app
  /api             - Next.js route handlers (all server-side)
  /auth            - Login/register pages
  /dashboard       - Protected dashboard routes
    /admin         - Admin routes
    /user          - User routes

/components
  /admin           - Admin-only components
  /charts          - Chart visualizations
  /dashboard       - Dashboard layout & nav
  /forms           - Form components
  /modals          - Modal dialogs
  /providers       - Context providers (Auth, Query, Socket)
  /tables          - Data tables
  /ui              - Base UI components

/lib
  auth.ts          - NextAuth configuration
  prisma.ts        - Prisma singleton
  realtime.ts      - Socket.IO server
  utils.ts         - Helper functions
  validation.ts    - Zod schemas

/prisma
  schema.prisma    - Database schema

/public
  offline.html     - Offline fallback page
  service-worker.js - PWA service worker
  reports/         - Generated PDF reports
```

---

## Development Workflows

### Making Changes

1. **UI Changes** → Modify `/components` (add `"use client"` if using hooks)
2. **API/DB Changes** → Update `prisma/schema.prisma` → `npm run db:generate` → `npm run db:push`
3. **Socket Events** → Update both `lib/realtime.ts` and `components/providers/SocketProvider.tsx`
4. **Always run** `npm run build` before committing

### Common Commands

```bash
npm run dev              # Start dev server
npm run build            # Production build (catches errors)
npm run lint             # Lint check
npm run test             # Run tests (Vitest)
npm run db:generate      # Regenerate Prisma client after schema changes
npm run db:push          # Sync schema to database
npm run db:studio        # Open Prisma Studio (GUI DB browser)
```

---

## Troubleshooting

### Login Issues

**Symptom**: User can't login or session not persisting

**Check**:
1. `.env.local` has valid NEXTAUTH_URL and NEXTAUTH_SECRET
2. Database connection working (`npm run db:studio`)
3. Email is case-insensitive (normalized to lowercase)
4. User exists in `User` table with correct email

**Debug Logs**: Added 🔐 [AUTH] logs in `lib/auth.ts`. Check browser console and terminal.

### Database Connection Failed

**Symptom**: `Error: connect ECONNREFUSED`

**Fix**:
1. Verify DATABASE_URL in `.env.local`
2. Ensure Supabase project is active
3. Check if using pooler connection (port 6543 for serverless)
4. Run `npm run db:studio` to test

### Socket.IO Not Connecting

**Symptom**: Real-time updates not working

**Check**:
1. NEXT_PUBLIC_SOCKET_URL matches dev server URL
2. Socket.IO server initialized (check console for "Socket.io initialized")
3. On production: Socket.IO disabled by design; polling is fallback

### Build Errors

**Symptom**: `npm run build` fails with type errors

**Fix**:
1. Check TypeScript errors: `npx tsc --noEmit`
2. Null coalesce nullable fields: `field || 'default'`
3. Verify all relations imported correctly in Prisma includes
4. Check for `"use client"` at top of client components

### Offline Page Issues

**Symptom**: App not working offline

**Check**:
1. Service Worker registered in `app/layout.tsx` (PWA setup)
2. `public/offline.html` exists and is styled
3. Browser allows service workers (not in incognito)
4. Check browser DevTools → Application → Service Workers

---

## Quick Reference

### Email Patterns
- **Admin Email**: `admin@financialpanel.com` (gets ADMIN role)
- **User Emails**: Any other email (gets USER role, requires approval)

### Status Values
- Budget: `PENDING`, `APPROVED`, `REJECTED`, `REVISION_REQUESTED`
- Expenditure: `PENDING`, `APPROVED`, `REJECTED`
- Supplementary: `PENDING`, `APPROVED`, `REJECTED`
- Project: `PROPOSED`, `STARTED`, `PROGRESSING`, `COMPLETED`
- Transaction: `PENDING`, `SUCCESS`, `FAILED`

### Important Files to Know
- `lib/auth.ts` - Authentication logic
- `middleware.ts` - Route protection
- `prisma/schema.prisma` - Database definition
- `.env.example` - All required variables
- `package.json` - Dependencies and scripts

### Deployment Checklist
- [ ] All environment variables set in Vercel
- [ ] Database schema pushed to production
- [ ] M-Pesa callback URL configured
- [ ] GitHub repository connected
- [ ] Vercel auto-deployment enabled
- [ ] Admin user created (email: admin@financialpanel.com)
- [ ] Test budget creation → approval flow
- [ ] Test offline functionality
- [ ] Verify Socket.IO disabled on production (polling active)

---

## Support & Resources

- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Prisma Docs**: https://www.prisma.io/docs
- **NextAuth Docs**: https://next-auth.js.org
- **Tailwind CSS**: https://tailwindcss.com/docs

---

**Last Updated**: February 5, 2026
**Status**: Production Ready ✅
