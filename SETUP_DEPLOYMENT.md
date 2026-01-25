# Supabase & Vercel Deployment Setup Guide

## 📋 Summary of Changes Made

Your project has been configured for production deployment. Here's what was added:

### Files Created
- ✅ `.env.example` - Template for all environment variables
- ✅ `vercel.json` - Vercel deployment configuration
- ✅ `.github/workflows/ci-cd.yml` - GitHub Actions CI/CD pipeline
- ✅ `DEPLOYMENT.md` - Detailed deployment instructions
- ✅ `.gitignore` - Updated to protect sensitive files

### Files Updated
- ✅ `.env.local` - Added Supabase configuration placeholders
- ✅ `package.json` - Added deployment scripts

## 🚀 Quick Start for Deployment

### Step 1: Get Supabase Connection String

1. Open [Supabase Dashboard](https://app.supabase.com)
2. Select project `jmwgruhqkhiknysaqyam`
3. Go to **Project Settings** → **Database** → **Connection String**
4. Copy the **URI** and get your database password
5. Update `.env.local`:

```bash
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@jmwgruhqkhiknysaqyam.supabase.co:5432/postgres"
```

### Step 2: Get Supabase Service Role Key

1. In Supabase Dashboard → **Project Settings** → **API**
2. Copy the **Service role secret**
3. Update `.env.local`:

```bash
SUPABASE_SERVICE_ROLE_KEY="[PASTE-YOUR-SERVICE-ROLE-KEY]"
```

### Step 3: Push Database Schema to Supabase

```bash
# Generate Prisma client
npm run db:generate

# Push schema to Supabase
npm run db:push

# Seed with initial data (optional)
npm run db:seed
```

### Step 4: Initialize Git Repository

```bash
git init
git add .
git commit -m "Initial commit: Financial Control Panel production-ready"
```

### Step 5: Create GitHub Repository

1. Go to [GitHub New Repo](https://github.com/new)
2. Create repository named `financial-control-panel`
3. Push your code:

```bash
git remote add origin https://github.com/YOUR-USERNAME/financial-control-panel.git
git branch -M main
git push -u origin main
```

### Step 6: Deploy to Vercel

1. Go to [Vercel](https://vercel.com/new)
2. Import your GitHub repository
3. Select **Next.js** framework
4. **⚠️ DO NOT DEPLOY YET**

### Step 7: Add Environment Variables to Vercel

Before deploying, click **Environment Variables** and add all variables from your `.env.local`:

**Critical Variables:**

```
NEXTAUTH_URL=https://[VERCEL-DOMAIN].vercel.app
NEXTAUTH_SECRET=[STRONG-RANDOM-SECRET-32-CHARS-MIN]
DATABASE_URL=postgresql://postgres:[PASSWORD]@jmwgruhqkhiknysaqyam.supabase.co:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://jmwgruhqkhiknysaqyam.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_c4FEukxLeSoY5RW4vAWt6w_-PRCMgHI
SUPABASE_SERVICE_ROLE_KEY=[YOUR-SERVICE-ROLE-KEY]
```

**M-Pesa Variables:**

```
MPESA_CONSUMER_KEY=[YOUR-MPESA-CONSUMER-KEY]
MPESA_CONSUMER_SECRET=[YOUR-MPESA-CONSUMER-SECRET]
MPESA_PASSKEY=[YOUR-MPESA-PASSKEY]
MPESA_SHORTCODE=174379
MPESA_CALLBACK_URL=https://[VERCEL-DOMAIN].vercel.app/api/webhooks/mpesa
```

**Other Variables:**

```
UPLOADTHING_SECRET=[YOUR-UPLOADTHING-SECRET]
UPLOADTHING_APP_ID=[YOUR-UPLOADTHING-APP-ID]
APP_URL=https://[VERCEL-DOMAIN].vercel.app
JWT_SECRET=[STRONG-RANDOM-SECRET-32-CHARS-MIN]
NEXT_PUBLIC_SOCKET_URL=https://[VERCEL-DOMAIN].vercel.app
```

### Step 8: Deploy!

Click **Deploy** in Vercel. Your app will be live in 2-3 minutes!

## 🔐 Environment Variables Checklist

**For `.env.local` (local development):**
- [ ] `DATABASE_URL` (local PostgreSQL)
- [ ] `NEXTAUTH_URL=http://localhost:3000`
- [ ] `NEXTAUTH_SECRET` (generate: `openssl rand -base64 32`)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` ✅ Already set
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` ✅ Already set
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (from Supabase)
- [ ] M-Pesa credentials
- [ ] UploadThing credentials

**For Vercel Production:**
- [ ] `DATABASE_URL` (Supabase PostgreSQL)
- [ ] `NEXTAUTH_URL` (your Vercel domain)
- [ ] `NEXTAUTH_SECRET` (generate fresh)
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `MPESA_CALLBACK_URL` (your Vercel domain)
- [ ] All other variables

## 📝 Important Notes

### Supabase

- **Database Password**: Get from Supabase when you created the project
- **Service Role Key**: ⚠️ Keep this secret! Never commit to GitHub
- **Backups**: Supabase auto-backs up daily (7-30 day retention)

### Vercel

- **Build Command**: Automatically set to `npm run build`
- **Start Command**: Automatically set to `npm start`
- **Node.js Version**: Vercel uses 18+ (auto-detected from `package.json`)
- **Automatic Deployments**: Each push to `main` triggers a deploy

### GitHub

- **Never commit** `.env.local` (it's in `.gitignore`)
- **Use `.env.example`** as a template
- **GitHub Secrets** are used for CI/CD deployment tokens

## 🔄 CI/CD Workflow

The `.github/workflows/ci-cd.yml` file automatically:

1. **On Every Push/PR:**
   - ✅ Runs TypeScript type check
   - ✅ Runs ESLint
   - ✅ Runs Vitest tests
   - ✅ Builds the project

2. **On Push to `main`:**
   - ✅ If tests pass, deploys to Vercel production

To enable auto-deployment via GitHub Actions:

1. Get from Vercel:
   - Go to Settings → Tokens
   - Copy `VERCEL_TOKEN`

2. Get from Vercel Project:
   - Project Settings → Copy `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`

3. Add to GitHub Secrets:
   - Repo Settings → Secrets and variables → Actions
   - Add `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`

## 🛠️ Useful Commands

```bash
# Local development
npm run dev

# Database management
npm run db:generate     # Regenerate Prisma client
npm run db:push         # Push schema to database
npm run db:seed         # Seed initial data
npm run db:studio       # Open Prisma Studio GUI

# Production checks
npm run build          # Build for production
npm run type-check     # Check TypeScript types
npm run lint           # Run ESLint
npm run test           # Run tests
```

## 📞 Support Resources

- **Supabase Docs**: https://supabase.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **Prisma Docs**: https://www.prisma.io/docs
- **Next.js Docs**: https://nextjs.org/docs
- **NextAuth.js**: https://next-auth.js.org

## 🎉 You're All Set!

After completing all steps:
1. Your backend is running on Supabase PostgreSQL
2. Your frontend is running on Vercel
3. GitHub Actions automatically tests and deploys changes
4. M-Pesa callbacks work with your Vercel domain
5. All environment variables are secure

**Next Steps:**
- [ ] Test login at your Vercel domain
- [ ] Verify database connection works
- [ ] Test M-Pesa callbacks
- [ ] Monitor logs in Vercel & Supabase
- [ ] Set up monitoring/alerts

Good luck! 🚀
