# 🚀 Deployment Commands Reference

Quick copy-paste commands for deployment. Run in order!

## 1. Supabase Setup (Get Credentials First)

```bash
# After getting your Supabase credentials, update .env.local
# Edit: DATABASE_URL and SUPABASE_SERVICE_ROLE_KEY

# Generate Prisma client
npm run db:generate

# Push schema to Supabase (⚠️ warning: modifies production database)
npm run db:push

# (Optional) Seed with initial data
npm run db:seed

# Verify database connection
npm run db:studio
```

## 2. Local Testing Before Push

```bash
# Build the project
npm run build

# Type check
npm run type-check

# Run lint
npm run lint

# Run tests
npm run test

# All together (recommended)
npm run build && npm run type-check && npm run lint && npm run test
```

## 3. Git Setup & Push

```bash
# Initialize git (if not done)
git init

# Add all files
git add .

# First commit
git commit -m "Initial commit: Production-ready Financial Control Panel"

# Add GitHub remote
git remote add origin https://github.com/YOUR-USERNAME/financial-control-panel.git

# Rename branch to main
git branch -M main

# Push to GitHub
git push -u origin main
```

## 4. Generate Secure Secrets

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Generate JWT_SECRET
openssl rand -base64 32

# On Windows (if no openssl):
# Use: https://www.uuidgenerator.net or similar tool
```

## 5. Deploy to Vercel

```bash
# Install Vercel CLI (optional, but useful)
npm i -g vercel

# Deploy to Vercel from CLI
vercel

# Deploy to production (after main branch push)
vercel --prod
```

## 6. Subsequent Deployments

```bash
# Make changes locally
git add .
git commit -m "Your commit message"

# Push to GitHub (automatically triggers Vercel deploy)
git push origin main

# Monitor deployment at:
# https://vercel.com/dashboard
```

## 🔍 Verification Commands

```bash
# Check if database is reachable
npm run db:studio

# Type check the project
npm run type-check

# List all environment variables needed
grep -r "process.env\." src/ app/ lib/ | sort | uniq

# Check which packages are installed
npm list

# Check Node.js version
node --version

# Check npm version
npm --version
```

## 🛠️ Troubleshooting Commands

```bash
# If build fails, clean and rebuild
rm -rf .next node_modules
npm install
npm run db:generate
npm run build

# Check for unused imports
npm run lint -- --fix

# Check TypeScript errors
npx tsc --noEmit

# Regenerate Prisma client
npm run db:generate

# Check running processes on port 3000
lsof -i :3000

# Kill process on port 3000
kill -9 $(lsof -t -i :3000)
```

## 📝 Environment Variables Setup

```bash
# Show current environment (don't commit!)
cat .env.local

# Copy template to use
cp .env.example .env.local

# Edit .env.local with your values
nano .env.local  # or vim, or open in editor

# Verify all required vars are set
grep -E '^[A-Z_]+=.*' .env.local
```

## 🔄 Database Management

```bash
# Check current Prisma schema
cat prisma/schema.prisma

# View database in web UI
npm run db:studio

# Reset database (⚠️ deletes all data!)
npx prisma db push --force-reset

# Create migration (if using migrations instead of db push)
npx prisma migrate dev --name migration_name

# View migrations
npx prisma migrate status
```

## 📦 Dependency Management

```bash
# Check for outdated packages
npm outdated

# Update all packages (carefully!)
npm update

# Install new package
npm install package-name

# Uninstall package
npm uninstall package-name

# Check for security vulnerabilities
npm audit

# Fix vulnerabilities automatically
npm audit fix
```

## 🚨 Emergency Rollback

```bash
# View deployment history in Git
git log --oneline

# Revert to previous commit (local)
git revert HEAD

# Force push previous version (use with caution!)
git reset --hard <commit-hash>
git push origin main --force

# In Vercel Dashboard:
# Deployments → Select previous → Promote to Production
```

## 📊 Monitoring Commands

```bash
# Watch build process
npm run build -- --verbose

# Watch tests
npm run test -- --watch

# Run dev server with logging
npm run dev

# Check file sizes
ls -lh .next/

# Check dependency size
npm ls

# Check what would be deployed
find .next -type f -name "*.js" | wc -l
```

## 🔐 Security Commands

```bash
# Check for exposed secrets (before pushing)
npm install -g detect-secrets
detect-secrets scan

# Verify no .env files are tracked
git ls-files | grep -E '\.env'

# Check git ignore is working
git check-ignore .env.local

# View what will be pushed
git diff --cached

# Scan for vulnerabilities
npm audit
npx snyk test
```

## 💡 Useful One-Liners

```bash
# Full deployment pipeline
npm run build && npm run type-check && npm run lint && npm run test && git add . && git commit -m "Ready for production" && git push origin main

# Check health before deploying
npm run type-check && npm run lint && npm run test

# Update database and seed
npm run db:generate && npm run db:push && npm run db:seed

# Development startup
npm run dev

# Production check
npm run build
```

## 📞 When Something Goes Wrong

```bash
# Check what's in your current environment
env | grep -E 'NODE|NPM|DATABASE|AUTH|VERCEL'

# Check database connectivity
npx prisma db execute --stdin < test.sql

# View Vercel logs (requires Vercel CLI)
vercel logs

# View specific deployment logs
vercel logs --follow

# Debug mode for next build
DEBUG=* npm run build
```

---

**Pro Tip**: Save this file and reference it often! 🎯
