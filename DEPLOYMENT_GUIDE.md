# Deployment Guide

## Critical Production Issues Fixed

### 1. Database Connection Pool - MaxClientsInSessionMode Error

**Problem**: On Vercel, login attempts fail with `MaxClientsInSessionMode: max clients reached` error.

**Root Cause**: Using session mode pooling (port 5432) instead of transaction mode (port 6543).

**Solution**: Update DATABASE_URL to use PgBouncer transaction mode.

#### Steps:

1. **Get correct connection string from Supabase**:
   - Go to Supabase Dashboard
   - Navigate to: Project Settings > Database > Connection Strings
   - Copy the "Connection Pooling" URI (NOT the regular "URI")
   - It should look like: `postgresql://postgres:password@aws-1-eu-west-1.pooler.supabase.com:6543/postgres`

2. **Update Vercel Environment Variable**:
   - Go to Vercel Dashboard > Your Project > Settings > Environment Variables
   - Find or create: `DATABASE_URL`
   - Set the value to: `postgresql://postgres:[YOUR_PASSWORD]@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?schema=public&pgbouncer=true`
   - **CRITICAL**: Ensure port is `6543` (NOT 5432) and includes `?pgbouncer=true` parameter
   - Save changes

3. **Redeploy**:
   - Go to Vercel Dashboard > Your Project > Deployments
   - Click "Redeploy" on the latest commit, OR
   - Make a commit to trigger automatic redeploy: `git commit --allow-empty -m "Redeploy with fixed DATABASE_URL"`

4. **Test**:
   - Visit your deployed app
   - Try logging in
   - Should NOT see "MaxClientsInSessionMode" errors
   - Check server logs for successful "Session callback" and role assignment logs

### 2. User Accessing Admin Dashboard - Role-Based Routing

**Problem**: After logging out and back in as a USER, user can access admin dashboard (`/dashboard/admin/*` routes).

**Root Cause**: 
- Middleware not properly enforcing role checks
- Dashboard redirect logic needed stronger validation
- Role normalization issues (case sensitivity)

**Solution**: 
- Enhanced middleware with strict role validation and normalization
- Updated dashboard root page with comprehensive role checks
- Added detailed logging for debugging

#### Changes Made:

1. **middleware.ts**:
   - Added role normalization (uppercase + trim)
   - Stricter unauthorized access checks
   - Added security violation logging
   - Explicit role validation in `authorized` callback
   - Suspicious activity logged with email and timestamp

2. **app/dashboard/page.tsx**:
   - Role normalization before comparison
   - Unrecognized role detection
   - Comprehensive logging at each checkpoint
   - Fallback redirect to login if something unexpected happens

#### Verification Steps:

1. **Test User Access**:
   ```
   1. Clear browser cookies/localStorage
   2. Log in as a regular user (email without admin status)
   3. Should be redirected to /dashboard/user/dashboard
   4. Try manually navigating to /dashboard/admin/dashboard
   5. Should be redirected back to login or /dashboard/user/dashboard
   6. Check console logs for [SECURITY] messages if blocked
   ```

2. **Test Admin Access**:
   ```
   1. Clear browser cookies/localStorage
   2. Log in as admin@financialpanel.com (or user with ADMIN role)
   3. Should be redirected to /dashboard/admin/dashboard
   4. Can access /dashboard/admin/* routes
   5. Trying to access /dashboard/user/* should redirect to admin dashboard
   ```

3. **Check Server Logs**:
   - Look for `[MIDDLEWARE]` entries showing role checks
   - Look for `[DASHBOARD]` entries showing redirect decisions
   - Look for `[SECURITY]` entries if unauthorized access attempted

## Local Development

### First Time Setup:

1. **Clone and install**:
   ```bash
   git clone <repo>
   cd Financial\ Control\ Panel
   npm install
   ```

2. **Database setup**:
   ```bash
   npm run db:generate    # Generate Prisma client
   npm run db:push        # Sync schema with DB
   npm run db:seed        # Seed initial data
   ```

3. **Environment setup**:
   - Copy `.env.example` to `.env.local`
   - For local development with Docker/local Postgres:
     ```
     DATABASE_URL="postgresql://dev:dev@localhost:5432/fcp?schema=public"
     ```
   - For testing with Supabase (optional):
     ```
     DATABASE_URL="postgresql://postgres:[password]@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?schema=public&pgbouncer=true"
     ```

4. **NextAuth setup**:
   ```
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="any-secret-for-local-dev"
   ```

5. **Start dev server**:
   ```bash
   npm run dev
   ```

### Running Tests:

```bash
npm run test              # Run all tests
npm run test -- --watch   # Watch mode
npm run lint              # Run linter
npm run build             # Full production build
```

## Common Issues & Solutions

### Issue: "MaxClientsInSessionMode: max clients reached"

**Solution**: Verify DATABASE_URL uses port 6543 and includes `?pgbouncer=true`

```bash
# Check current DATABASE_URL
echo $DATABASE_URL
# Should contain: :6543 and pgbouncer=true

# On Vercel: Go to Settings > Environment Variables and update
```

### Issue: USER can access admin dashboard

**Solution**: Check middleware logs in Vercel dashboard

1. Go to Vercel > Project > Deployments > Latest > Logs
2. Look for `[SECURITY]` or `[MIDDLEWARE]` entries
3. Verify DATABASE_URL is correct (database role queries may fail)
4. Check NextAuth session is being created with correct role

### Issue: Login redirects infinitely

**Solution**: 
1. Check NEXTAUTH_SECRET is set in Vercel environment variables
2. Verify NEXTAUTH_URL matches deployment domain
3. Check database connection is working (DATABASE_URL test in Supabase dashboard)

## Environment Variables Reference

### Local Development (.env.local):
```
DATABASE_URL=postgresql://dev:dev@localhost:5432/fcp?schema=public
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-dev-secret
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
MPESA_CALLBACK_URL=http://localhost:3000/api/webhooks/mpesa
```

### Vercel Production (Settings > Environment Variables):
```
DATABASE_URL=postgresql://postgres:[PASSWORD]@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?schema=public&pgbouncer=true
NEXTAUTH_URL=https://your-production-domain.vercel.app
NEXTAUTH_SECRET=generate-strong-secret-with-openssl
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
MPESA_CALLBACK_URL=https://your-production-domain.vercel.app/api/webhooks/mpesa
(all other config same as local)
```

## Monitoring & Debugging

### Enable Detailed Logging:

Add to `.env.local` for local development:
```
DEBUG=@auth/*
```

### Vercel Logs:

1. Function Logs: Shows server-side errors and console.log outputs
2. Runtime Logs: Shows deployment and build issues

### Key Log Patterns to Watch:

- `[MIDDLEWARE] Route check` - Request going through middleware
- `[DASHBOARD]` - Dashboard page handling redirect
- `[SECURITY]` - Unauthorized access attempt
- `[ERROR] Unauthorized admin access attempt` - Someone tried accessing admin routes
- `FATAL: MaxClientsInSessionMode` - Database pool exhausted (fix DATABASE_URL)

## Rollback Procedure

If production deployment breaks:

1. Go to Vercel Dashboard > Deployments
2. Find previous working deployment
3. Click the three dots > Redeploy
4. This will revert to the previous working version

Then investigate the issue locally before re-deploying.

## Post-Deployment Checklist

After deploying:

- [ ] Test login with regular user
- [ ] Verify user redirected to `/dashboard/user/dashboard`
- [ ] Test login with admin
- [ ] Verify admin redirected to `/dashboard/admin/dashboard`
- [ ] Try user accessing `/dashboard/admin/*` - should redirect
- [ ] Check Vercel logs for any errors
- [ ] Verify no "MaxClientsInSessionMode" errors in logs
