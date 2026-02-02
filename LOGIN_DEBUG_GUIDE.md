# Login Flow Debugging Guide

## Current Status
The login flow has been improved with better error handling and retry logic. If you're still having issues, follow this guide.

## Test Credentials

**Admin User:**
- Email: `admin@financialpanel.com`
- Password: `admin@financialpanel@2026`
- Expected redirect: `/dashboard/admin/dashboard`

**If you don't have a test user:**
```bash
npm run db:push        # Ensure schema is up to date
npm run db:generate    # Generate Prisma client
npm run db:seed        # Create the seed data with admin user
```

## Expected Login Flow

```
1. User enters email & password
2. Click "Sign In" button
3. Browser console shows: "📱 [LOGIN] Form submitted, attempting login for: email@example.com"
4. Wait ~1 second
5. Browser console shows: "📱 [LOGIN] signIn response: { ok: true, ... }"
6. Success toast appears: "Logged in successfully"
7. Browser console shows: "📱 [LOGIN] Waiting for session cookie to be written..."
8. Wait ~1.5 seconds
9. Browser console shows: "📱 [LOGIN] Session fetch attempt 1/5..."
10. Browser console shows: "📱 [LOGIN] ✓ Session retrieved: { userId, email, role, isApproved }"
11. Browser console shows: "📱 [LOGIN] Performing navigation to: /dashboard/admin/dashboard"
12. Page redirects and loads dashboard
```

## Debugging Steps

### Step 1: Check Browser Console
Open DevTools (F12) and go to **Console** tab.

**Look for these logs (in order):**
```
📱 [LOGIN] Form submitted, attempting login for: admin@financialpanel.com
📱 [LOGIN] signIn response: { ok: true, error: null, status: 200 }
📱 [LOGIN] ✓ Credentials validated by server, showing success message
📱 [LOGIN] Waiting for session cookie to be written...
📱 [LOGIN] Attempting to fetch session...
📱 [LOGIN] Session fetch attempt 1/5...
📱 [LOGIN] ✓ Session retrieved: { userId: "...", email: "admin@financialpanel.com", role: "ADMIN", isApproved: true }
📱 [LOGIN] Determined redirect target: { role: "ADMIN", isApproved: true }
📱 [LOGIN] Performing navigation to: /dashboard/admin/dashboard
```

### Step 2: Identify Where It Fails

**If you see these logs:**
- `Form submitted` → `signIn response: { ok: false, error: "..." }` 
  - **Problem**: Invalid credentials or user not found
  - **Solution**: Check email/password are correct, ensure user exists in DB
  
- `Form submitted` → `signIn response: { ok: true }` → NO "Session retrieved" log
  - **Problem**: Session cookie not being set by NextAuth
  - **Solution**: Check Network tab for `Set-Cookie` header in auth response
  
- `Form submitted` → `signIn response` → `❌ Unexpected error`
  - **Problem**: JavaScript error in the login code
  - **Solution**: Check the error message and stack trace in console

### Step 3: Check Network Tab

Open DevTools → **Network** tab

**Look for the POST request to `/api/auth/callback/credentials`:**

1. Click the request
2. Go to **Response** tab - should contain JSON with user data
3. Go to **Headers** tab → Look for **Response Headers** section
4. **CRITICAL**: Look for `set-cookie` header with `next-auth.session-token`

If you DON'T see the `set-cookie` header:
- NextAuth callbacks aren't working properly
- Check [lib/auth.ts](lib/auth.ts) for errors in jwt/session callbacks
- Check server logs (Vercel dashboard)

### Step 4: Check Vercel Logs (Production)

If testing on Vercel:
1. Go to Vercel dashboard
2. Select your project
3. Go to **Logs** tab
4. Filter for your email address

Look for:
```
🔐 [AUTH] authorize() called with credentials: { email: 'admin@...', passwordLength: 24 }
🔐 [AUTH] ✓ User found: { id: '...', email: 'admin@...', hasPassword: true }
🔐 [AUTH] ✓ Password valid
🔐 [AUTH] ✓ User authorized successfully: { id: '...', role: 'ADMIN' }
🔐 [JWT] Initial login - setting token: { userId: '...', email: 'admin@...' }
🔐 [JWT] ✓ Initial token created: { userId: '...', role: 'ADMIN', isApproved: true }
[SESSION] Starting callback...
[SESSION] ✓ Callback complete: { userId: '...', role: 'ADMIN', isApproved: true }
```

## Common Issues & Solutions

### Issue: "Invalid email or password" toast

**Cause**: Either email doesn't exist in DB or password is wrong

**Solutions:**
1. Make sure user exists: 
   ```bash
   npm run db:seed  # Creates admin@financialpanel.com
   ```
2. Double-check password: `admin@financialpanel@2026`
3. Verify case sensitivity is handled (emails should be lowercased)

### Issue: "Logged in successfully" toast but no session

**Cause**: Session cookie not being set OR getSession() can't read it

**Solutions:**
1. Check Network tab - is `set-cookie` header present?
2. Increase wait time in login/page.tsx:
   ```typescript
   await new Promise((r) => setTimeout(r, 2000)) // Increase from 1500
   ```
3. Check if cookies are enabled in browser

### Issue: Form reloads when clicking Sign In

**Cause**: Either form validation failed OR error thrown before toast

**Solutions:**
1. Check browser console for validation errors (before "Form submitted" log)
2. Look for JavaScript errors in red text
3. Check that both email and password fields have valid input

### Issue: Session retrieved but then redirects back to login

**Cause**: Middleware rejecting the request

**Solutions:**
1. Check middleware logs: `[MIDDLEWARE]` in console
2. Verify user role is 'ADMIN' or 'USER' (not null)
3. Verify isApproved is true (unless unapproved user, should go to pending-approval)
4. Check [middleware.ts](middleware.ts) routes and role checks

### Issue: Redirect to wrong dashboard

**Cause**: Role or approval status incorrect in session

**Check in console:**
- Role should be 'ADMIN' for admin@financialpanel.com
- isApproved should be true

**If wrong**, check database:
```bash
npm run db:generate
npm run db:push
npx prisma studio  # Opens visual DB editor
```

Then find the user and verify `role` and `isApproved` fields.

## Testing Checklist

- [ ] Admin user can login with `admin@financialpanel.com` / `admin@financialpanel@2026`
- [ ] Success toast appears
- [ ] Redirects to `/dashboard/admin/dashboard`
- [ ] All console logs appear in expected order
- [ ] No JavaScript errors in console
- [ ] Browser Network tab shows `set-cookie` header
- [ ] Middleware allows access (no `[MIDDLEWARE] No token found` log)

## Key Files

- [app/auth/login/page.tsx](app/auth/login/page.tsx) - Login form logic
- [lib/auth.ts](lib/auth.ts) - NextAuth configuration
- [middleware.ts](middleware.ts) - Route protection
- [prisma/schema.prisma](prisma/schema.prisma) - User model
- [prisma/seed.ts](prisma/seed.ts) - Creates test users

## Server Logs

To see server-side logs:

**Local Development:**
```bash
npm run dev
# Look for logs with 🔐 [AUTH], 🔐 [JWT], [SESSION], [MIDDLEWARE]
```

**Production (Vercel):**
1. Vercel Dashboard → Logs tab
2. Search for your email or 'AUTH'
3. Look for error messages or missing logs

## Further Help

If none of these steps work:

1. **Restart the dev server:**
   ```bash
   Ctrl+C (in terminal)
   npm run dev
   ```

2. **Clear browser storage:**
   - DevTools → Application → Cookies → Delete all
   - DevTools → Application → Local Storage → Clear all

3. **Check for recent changes:**
   ```bash
   git log --oneline -10  # See recent commits
   git diff HEAD~1        # See what changed
   ```

4. **Verify environment variables:**
   - Check `.env.local` has NEXTAUTH_URL and NEXTAUTH_SECRET
   - Check DATABASE_URL points to correct database

5. **Reset database:**
   ```bash
   npm run db:push --force
   npm run db:seed
   ```

## Production Deployment

After fixes are committed:

```bash
git add .
git commit -m "Fix login issues"
git push
# Vercel auto-deploys
# Wait ~2-3 minutes for deployment
# Test on your Vercel URL
```
