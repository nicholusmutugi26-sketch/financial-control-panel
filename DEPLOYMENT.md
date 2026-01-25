# Deployment Guide

This guide covers deploying the Financial Control Panel to Supabase (backend) and Vercel (frontend).

## Prerequisites

- **Supabase Account**: https://supabase.com
- **Vercel Account**: https://vercel.com
- **GitHub Repository**: Push your code before deploying
- **Node.js 18+**: Installed locally

## Step 1: Setup Supabase Database

### 1.1 Get Supabase Credentials

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project: `jmwgruhqkhiknysaqyam`
3. Navigate to **Project Settings** → **Database** → **Connection String**
4. Copy the PostgreSQL URI (Connection String - URI tab)
5. Replace `[YOUR-PASSWORD]` with your database password

Format:
```
postgresql://postgres:[YOUR-PASSWORD]@jmwgruhqkhiknysaqyam.supabase.co:5432/postgres
```

### 1.2 Get Service Role Key

1. In Supabase Dashboard, go to **Project Settings** → **API**
2. Copy the **Service role secret** (⚠️ Keep this secure!)

### 1.3 Update Local Environment

Update `.env.local`:

```bash
# Supabase Database
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@jmwgruhqkhiknysaqyam.supabase.co:5432/postgres"

# Supabase API Keys
NEXT_PUBLIC_SUPABASE_URL="https://jmwgruhqkhiknysaqyam.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_c4FEukxLeSoY5RW4vAWt6w_-PRCMgHI"
SUPABASE_SERVICE_ROLE_KEY="[YOUR-SERVICE-ROLE-KEY]"
```

### 1.4 Push Prisma Schema to Supabase

```bash
# Generate Prisma client
npm run db:generate

# Push schema to Supabase production database
npm run db:push

# Seed database (optional, if you have seed data)
npm run db:seed
```

⚠️ **Warning**: `db:push` will alter your production database. Use with caution.

## Step 2: Prepare for GitHub

### 2.1 Initialize Git (if not already done)

```bash
git init
git add .
git commit -m "Initial commit: Financial Control Panel"
```

### 2.2 Create GitHub Repository

1. Go to [GitHub](https://github.com/new)
2. Create a new repository (e.g., `financial-control-panel`)
3. Push your code:

```bash
git remote add origin https://github.com/YOUR-USERNAME/financial-control-panel.git
git branch -M main
git push -u origin main
```

## Step 3: Deploy to Vercel

### 3.1 Create Vercel Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New** → **Project**
3. Select your GitHub repository
4. Choose **Next.js** as the framework (auto-detected)
5. Click **Deploy** (don't deploy yet, we need to add environment variables)

### 3.2 Add Environment Variables to Vercel

In Vercel Project Settings → **Environment Variables**, add:

```
NEXTAUTH_URL=https://[YOUR-VERCEL-DOMAIN].vercel.app
NEXTAUTH_SECRET=[GENERATE-A-STRONG-SECRET]
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@jmwgruhqkhiknysaqyam.supabase.co:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://jmwgruhqkhiknysaqyam.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_c4FEukxLeSoY5RW4vAWt6w_-PRCMgHI
SUPABASE_SERVICE_ROLE_KEY=[YOUR-SERVICE-ROLE-KEY]
MPESA_CONSUMER_KEY=[YOUR-MPESA-KEY]
MPESA_CONSUMER_SECRET=[YOUR-MPESA-SECRET]
MPESA_PASSKEY=[YOUR-MPESA-PASSKEY]
MPESA_SHORTCODE=174379
MPESA_CALLBACK_URL=https://[YOUR-VERCEL-DOMAIN].vercel.app/api/webhooks/mpesa
UPLOADTHING_SECRET=[YOUR-UPLOADTHING-SECRET]
UPLOADTHING_APP_ID=[YOUR-UPLOADTHING-APP-ID]
APP_URL=https://[YOUR-VERCEL-DOMAIN].vercel.app
JWT_SECRET=[GENERATE-A-STRONG-SECRET]
NEXT_PUBLIC_SOCKET_URL=https://[YOUR-VERCEL-DOMAIN].vercel.app
```

### 3.3 Deploy

Once environment variables are added:
1. Go back to the Deployment tab
2. Click **Deploy** to start the deployment

Monitor the build logs—it should take 2-3 minutes.

## Step 4: Setup GitHub Actions (Optional but Recommended)

The `.github/workflows/ci-cd.yml` file automatically:
- Runs tests on every push/PR
- Runs type checking and linting
- Deploys to Vercel on `main` branch pushes

To enable automatic Vercel deployment via GitHub Actions:

1. Get your Vercel tokens:
   - `VERCEL_TOKEN`: From Vercel Settings → Tokens
   - `VERCEL_ORG_ID`: From Vercel Team Settings
   - `VERCEL_PROJECT_ID`: From your project settings

2. Add to GitHub Secrets:
   - Go to GitHub repo → Settings → Secrets and variables → Actions
   - Add `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`

## Step 5: Verify Deployment

Once deployed:

1. **Test the App**:
   ```
   https://[YOUR-VERCEL-DOMAIN].vercel.app
   ```

2. **Check Database Connection**:
   - Navigate to a page that requires database access (e.g., Dashboard)
   - Verify data loads correctly

3. **Check Logs**:
   - Vercel: **Deployments** → **Logs**
   - Supabase: **Project Settings** → **Database** → Monitor

4. **Test M-Pesa Callbacks**:
   - Update M-Pesa configuration with the new Vercel domain

## Updating M-Pesa Configuration

After getting your Vercel domain, update M-Pesa in Safaricom developer console:

- **Callback URL**: `https://[YOUR-VERCEL-DOMAIN].vercel.app/api/webhooks/mpesa`
- **API Base URL**: `https://[YOUR-VERCEL-DOMAIN].vercel.app/api`

## Troubleshooting

### Build Fails on Vercel
- Check environment variables are set correctly
- Ensure `DATABASE_URL` points to Supabase
- Check logs in Vercel dashboard

### Database Connection Issues
- Verify Supabase IP is whitelisted
- Check `DATABASE_URL` format
- Ensure Supabase PostgreSQL instance is running

### M-Pesa Callbacks Not Working
- Update `MPESA_CALLBACK_URL` in environment variables
- Update callback URL in Safaricom developer console
- Check webhook logs in Supabase

### Socket.io Not Connecting
- Update `NEXT_PUBLIC_SOCKET_URL` to your Vercel domain
- Check browser console for connection errors

## Security Notes

⚠️ **Never commit** `.env.local` to GitHub. Use `.env.example` as a template.

**Secure your secrets**:
- Rotate `NEXTAUTH_SECRET` and `JWT_SECRET` regularly
- Keep `SUPABASE_SERVICE_ROLE_KEY` secret
- Use GitHub Secrets for CI/CD tokens

## Rollback

To revert to a previous version:

### Vercel
- Deployments → Select previous deployment → Promote

### Supabase
- Backups → Restore from backup (available for 7-30 days)

## Support

For issues:
- **Vercel**: https://vercel.com/docs
- **Supabase**: https://supabase.com/docs
- **Next.js**: https://nextjs.org/docs
- **Prisma**: https://www.prisma.io/docs/
