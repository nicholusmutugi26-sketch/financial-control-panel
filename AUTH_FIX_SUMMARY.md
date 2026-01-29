# Authentication Flow Fix - Redirect Loop Issue

## 🔴 Problem Summary
Users were getting redirected back to login after attempting to log in, even with correct credentials. Sometimes they saw "logged in successfully" toast but still couldn't access the dashboard.

## 🎯 Root Causes Identified

### 1. **Incomplete Token Initialization (JWT Callback)**
The JWT callback wasn't setting all required fields when a user first logged in. This caused the session callback to receive incomplete data.

**Issue:** Only basic fields were set; `image` field was missing, and error handling wasn't proper.

**Fix:** 
- Ensure ALL required fields are set on first login: `id`, `email`, `name`, `role`, `isApproved`, `image`
- Added comprehensive validation and logging
- Clear error messages when critical fields are missing

### 2. **Over-Complicated Session Callback**
The session callback was trying to fetch user from database on every call, which created unnecessary latency and potential race conditions.

**Issue:** 
- Extra DB calls on every session refresh
- Trying to update fields that weren't changing
- Complex error handling paths

**Fix:**
- Simplified to use token as source of truth
- Removed redundant DB fetches
- Validate critical fields and fail fast if invalid
- Trust the JWT callback to keep data current

### 3. **Redirect Timing Issue (Login Form)**
The login form was using `redirect: true` which let NextAuth handle the redirect automatically, but this could happen before the session cookie was properly set.

**Issue:**
- Session cookie might not be set when redirect happens
- Browser makes request to `/dashboard` before auth is ready
- Middleware sees invalid/missing session and redirects to login

**Fix:**
- Changed to `redirect: false` for manual control
- Added explicit 100ms delay to ensure cookie is set
- Manually redirect with `router.push()` after session is ready
- Better error handling with explicit logging

### 4. **Role Storage Confusion**
The registration was storing a `role` field in the database, but the auth system was trying to derive role from email. This created two sources of truth.

**Issue:**
- JWT callback deriving role from email: `admin@financialpanel.com` → ADMIN
- But database had a stored role field that wasn't being used
- Session callback fetching role from DB but not using it

**Fix:**
- **Removed** `role` field from user creation in registration
- Role is now **ONLY** derived from email
- Email-based role logic: `admin@financialpanel.com` → ADMIN, all others → USER
- Audit logs show the derived role instead

## 📝 Detailed Changes

### 1. `lib/auth.ts` - JWT Callback

**Before:**
```typescript
// Incomplete token setup
token.id = user.id
token.email = user.email
token.name = user.name
token.isApproved = (user as any).isApproved
if ((user as any).image) token.image = (user as any).image
token.role = derived_from_email
```

**After:**
```typescript
// Comprehensive initial setup
token.id = user.id
token.email = user.email
token.name = user.name || ''  // Default to empty string
token.image = (user as any).image || null  // Default to null
token.isApproved = (user as any).isApproved === true  // Explicit boolean
token.role = derived_from_email  // Always derived, not stored

// Add validation checks
if (!token.id || !token.email) {
  console.error('Missing critical token fields')
  return token
}

// Log every step for debugging
console.log('🔐 [JWT] ✓ Initial token created:', {...})
```

### 2. `lib/auth.ts` - Session Callback

**Before:**
```typescript
// Complex multi-step process
// Step 1: Initialize from token
session.user.id = token.id
// ... more fields

// Step 2: Fetch from DB and update
const dbUser = await prisma.user.findUnique(...)
session.user.role = dbUser.role  // ❌ Wrong - using stored role
// ... more updates

// Step 3: Final validation (too late, already has wrong data)
```

**After:**
```typescript
// Simple, token-is-truth approach
// Critical: Must have session and token with all fields
if (!session || !token || !token.id || !token.email) {
  console.error('Invalid session/token')
  return session
}

// Just copy from token - it's already validated and complete
session.user.id = token.id
session.user.email = token.email
session.user.name = token.name || ''
session.user.role = token.role || 'USER'
session.user.isApproved = token.isApproved === true

// Final validation
if (!['ADMIN', 'USER'].includes(session.user.role)) {
  session.user.role = 'USER'
}
```

### 3. `app/auth/login/page.tsx` - Login Form

**Before:**
```typescript
const result = await signIn('credentials', {
  email: lowercaseEmail,
  password: data.password,
  redirect: true,  // ❌ Redirect might happen too early
  callbackUrl: '/dashboard',
})
// Control might never reach here if redirect happens
if (!result?.ok) {
  // Error handling
}
```

**After:**
```typescript
const result = await signIn('credentials', {
  email: lowercaseEmail,
  password: data.password,
  redirect: false,  // ✓ We control when to redirect
})

if (!result?.ok || result?.error) {
  // Immediate error handling
  toast.error('Invalid email or password')
  return
}

// ✓ Success - wait for session cookie to be set
await new Promise(resolve => setTimeout(resolve, 100))

// Now safe to redirect
toast.success('Logged in successfully')
router.push('/dashboard')
```

### 4. `app/api/auth/register/route.ts` - Registration

**Before:**
```typescript
// ❌ Storing role in database
const role = userCount === 0 ? 'ADMIN' : 'USER'
const user = await prisma.user.create({
  data: {
    name: validatedData.name,
    email: normalizedEmail,
    password: hashedPassword,
    role,  // ❌ Stored but never used correctly
    isApproved,
  },
})
```

**After:**
```typescript
// ✓ No role stored - derives from email only
const user = await prisma.user.create({
  data: {
    name: validatedData.name,
    email: normalizedEmail,
    password: hashedPassword,
    // NOTE: role NOT stored, derived from email
    isApproved,
  },
})

// Show derived role in audit log
const derivedRole = normalizedEmail === 'admin@financialpanel.com' 
  ? 'ADMIN' 
  : 'USER'
```

## 🔒 Security Implications

### Role Derivation
- **Email-based role is FINAL SOURCE OF TRUTH**
- Can never be spoofed or changed via token manipulation
- First user registered with `admin@financialpanel.com` automatically gets ADMIN
- All others get USER role
- Middleware enforces role-based access control

### Session Validation
- Token must have: `id`, `email`, `role`, `isApproved`
- Missing any critical field = invalid session
- Session callback validates and fails fast
- Logging at every step for debugging

## 🧪 Testing Checklist

Before deploying, verify:

1. **First-time login as admin:**
   ```
   Email: admin@financialpanel.com
   Password: [test password]
   Expected: Logs in → Dashboard admin page
   ```

2. **Second user (regular user):**
   ```
   Email: user@example.com
   Password: [test password]
   Expected: Logs in → Pending approval page
   Approved by admin → Dashboard user page
   ```

3. **Invalid credentials:**
   ```
   Email: admin@financialpanel.com
   Password: [wrong password]
   Expected: "Invalid email or password" toast
   Stays on login page
   ```

4. **Session persistence:**
   - Login → Go to dashboard → Refresh page
   - Expected: Still logged in (session maintained)

5. **Role-based access:**
   - Admin can access `/dashboard/admin/*`
   - User gets redirected to `/dashboard/user/*`
   - Unapproved users can only see pending approval page

## 📊 Flow Diagram (After Fix)

```
1. User submits credentials
   ↓
2. signIn('credentials', { redirect: false }) → authorize() validates in lib/auth.ts
   ↓
3. authorize() returns user object with all fields
   ↓
4. JWT callback runs → token.id, email, role, isApproved all set
   ✓ Token is complete and valid
   ↓
5. NextAuth sets session cookie
   ↓
6. 100ms delay to ensure cookie is set
   ↓
7. Login page calls router.push('/dashboard')
   ↓
8. Middleware validates token (via withAuth wrapper)
   ↓
9. Session callback runs → copies all fields from token
   ✓ Session is valid
   ↓
10. Dashboard page checks role and redirects to:
    - /dashboard/admin/dashboard (if ADMIN)
    - /dashboard/pending-approval (if USER and not approved)
    - /dashboard/user/dashboard (if USER and approved)
```

## 🚀 Deployment

1. Build locally: `npm run build` ✓
2. Commit: `git add -A && git commit -m "..."`
3. Push: `git push origin main`
4. Vercel auto-deploys
5. Monitor logs for 🔐 [JWT], 📱 [LOGIN], [SESSION] messages

## 📋 Debugging Commands

Check browser console for these log prefixes:
- `🔐 [JWT]` - JWT callback events
- `📱 [LOGIN]` - Login form events
- `[SESSION]` - Session callback events
- `[DASHBOARD-ROOT]` - Dashboard role checking
- `[MIDDLEWARE]` - Route protection
- `🔐 [AUTH]` - Credentials provider authorization

All logs include timestamps and detailed context.

