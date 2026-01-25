# Production Deployment Checklist

## Pre-Deployment ✅

- [ ] Run `npm run build` locally - verify no errors
- [ ] Run `npm run test` - all tests pass
- [ ] Run `npm run lint` - no lint errors
- [ ] Run `npm run type-check` - no TypeScript errors
- [ ] Review `.env.example` for all required variables
- [ ] Have Supabase credentials ready (URL, password, service role key)

## Supabase Setup

- [ ] Get Supabase Database Connection String
  - URL: https://jmwgruhqkhiknysaqyam.supabase.co
  - Get password from project creation email or reset it
- [ ] Get Supabase Service Role Key from API settings
- [ ] Update `.env.local` with Supabase credentials
- [ ] Run `npm run db:generate` to update Prisma client
- [ ] Run `npm run db:push` to push schema to Supabase
- [ ] (Optional) Run `npm run db:seed` to add initial data
- [ ] Verify database connection from Prisma Studio: `npm run db:studio`

## GitHub Setup

- [ ] Create new GitHub repository
- [ ] Clone repository locally (or initialize if pushing existing)
- [ ] Ensure `.gitignore` includes `.env.local` ✅
- [ ] Add all files: `git add .`
- [ ] Commit: `git commit -m "Initial commit: Financial Control Panel"`
- [ ] Add remote: `git remote add origin https://github.com/YOUR-USERNAME/financial-control-panel.git`
- [ ] Push to main: `git push -u origin main`
- [ ] Verify repository is on GitHub

## Vercel Deployment

### Create Project
- [ ] Go to https://vercel.com/new
- [ ] Import GitHub repository
- [ ] Select `financial-control-panel` repo
- [ ] Framework: **Next.js** (auto-selected)
- [ ] **Stop here** - don't deploy yet

### Add Environment Variables

**Critical Variables** (must have):
- [ ] `NEXTAUTH_URL` = `https://[VERCEL-DOMAIN].vercel.app`
- [ ] `NEXTAUTH_SECRET` = Generate with: `openssl rand -base64 32`
- [ ] `DATABASE_URL` = Supabase PostgreSQL connection string
- [ ] `NEXT_PUBLIC_SUPABASE_URL` = `https://jmwgruhqkhiknysaqyam.supabase.co`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `sb_publishable_c4FEukxLeSoY5RW4vAWt6w_-PRCMgHI`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` = Your service role key

**M-Pesa Variables**:
- [ ] `MPESA_CONSUMER_KEY` = Your M-Pesa consumer key
- [ ] `MPESA_CONSUMER_SECRET` = Your M-Pesa consumer secret
- [ ] `MPESA_PASSKEY` = Your M-Pesa passkey
- [ ] `MPESA_SHORTCODE` = `174379`
- [ ] `MPESA_CALLBACK_URL` = `https://[VERCEL-DOMAIN].vercel.app/api/webhooks/mpesa`

**Other Variables**:
- [ ] `UPLOADTHING_SECRET` = Your UploadThing secret
- [ ] `UPLOADTHING_APP_ID` = Your UploadThing app ID
- [ ] `APP_URL` = `https://[VERCEL-DOMAIN].vercel.app`
- [ ] `JWT_SECRET` = Generate with: `openssl rand -base64 32`
- [ ] `NEXT_PUBLIC_SOCKET_URL` = `https://[VERCEL-DOMAIN].vercel.app`

### Deploy
- [ ] Click **Deploy** in Vercel
- [ ] Wait for build to complete (2-3 minutes)
- [ ] Check build logs for errors
- [ ] Visit your deployed URL
- [ ] Test login functionality

## Post-Deployment Testing

### Frontend Verification
- [ ] Visit your Vercel domain: `https://[DOMAIN].vercel.app`
- [ ] Page loads without 500 errors
- [ ] CSS/styling loads correctly
- [ ] Images load correctly
- [ ] SVG icons load (no 404s)

### Authentication Testing
- [ ] Can access login page
- [ ] Can register a new account
- [ ] Can login with existing account
- [ ] Session persists on page refresh
- [ ] Logout works

### Database Testing
- [ ] Dashboard loads data from Supabase
- [ ] Can create a budget
- [ ] Can create an expenditure
- [ ] Data persists after refresh
- [ ] No database connection errors in logs

### M-Pesa Integration Testing (if applicable)
- [ ] M-Pesa callback URL updated in Safaricom dashboard
- [ ] Test payment flow
- [ ] Callback webhook receives data
- [ ] Payment status updates in database

### Monitoring
- [ ] Check Vercel Deployments dashboard
- [ ] Check Vercel Function logs for errors
- [ ] Check Supabase Query Performance
- [ ] Monitor error rates

## GitHub Actions Setup (Optional)

For automatic deployments on push:

- [ ] Get Vercel Token from Settings → Tokens
- [ ] Get Vercel ORG ID from Team Settings
- [ ] Get Vercel PROJECT ID from Project Settings
- [ ] Add to GitHub Secrets:
  - [ ] `VERCEL_TOKEN`
  - [ ] `VERCEL_ORG_ID`
  - [ ] `VERCEL_PROJECT_ID`
- [ ] Test by pushing a commit to main
- [ ] Verify automatic deployment triggers

## Security Review

- [ ] `.env.local` is NOT in Git (check `.gitignore`)
- [ ] No secrets logged in console
- [ ] NEXTAUTH_SECRET is strong (32+ chars)
- [ ] SUPABASE_SERVICE_ROLE_KEY is secure
- [ ] M-Pesa credentials are secure
- [ ] Database has backup enabled in Supabase
- [ ] CORS configured correctly (if needed)

## Documentation

- [ ] Read `DEPLOYMENT.md` for detailed instructions
- [ ] Read `SETUP_DEPLOYMENT.md` for quick reference
- [ ] Team has access to environment variables document
- [ ] Team knows how to redeploy if needed
- [ ] Team knows how to roll back (Vercel Deployments tab)

## Go-Live Checklist

- [ ] All tests passing
- [ ] Build succeeds
- [ ] No console errors
- [ ] Database synced
- [ ] M-Pesa configured (if applicable)
- [ ] Team trained on production procedures
- [ ] Monitoring/alerting set up
- [ ] Backup procedures documented

## Post-Launch Monitoring (First 24 Hours)

- [ ] Monitor error logs in Vercel
- [ ] Monitor database in Supabase
- [ ] Check M-Pesa webhook logs
- [ ] Monitor user logins
- [ ] Check for any reported issues
- [ ] Review analytics if available

## Maintenance

- [ ] Weekly: Check Vercel deployment logs
- [ ] Weekly: Check Supabase database size
- [ ] Monthly: Verify backups are working
- [ ] Monthly: Review security logs
- [ ] Quarterly: Update dependencies
- [ ] Quarterly: Test disaster recovery/rollback

---

**Status**: Ready for Deployment ✅
**Last Updated**: January 25, 2026
**Deployer**: Your Name
**Date Deployed**: ___________
**Notes**: ___________________________________________________________
