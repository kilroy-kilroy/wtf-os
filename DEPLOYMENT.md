# Deployment Guide: Vercel + Supabase

## Step 1: Set Up Supabase

### 1.1 Create New Supabase Project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Fill in the details:
   - **Name**: `wtf-growth-os` (or your preferred name)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to your users (e.g., `us-east-1`)
   - **Pricing Plan**: Start with Free tier
4. Click **"Create new project"**
5. Wait 2-3 minutes for provisioning

### 1.2 Run Database Schema

1. In your Supabase project dashboard, go to **SQL Editor** (left sidebar)
2. Click **"New query"**
3. Open the file `packages/db/schema.sql` from this repo
4. Copy the **entire contents** of the file
5. Paste into the SQL Editor
6. Click **"Run"** (or press Cmd/Ctrl + Enter)
7. You should see: **"Success. No rows returned"** ✅

This creates all 14 tables, indexes, and RLS policies.

### 1.3 Get Your API Keys

1. In Supabase, go to **Settings** → **API**
2. Copy these three values (you'll need them for Vercel):
   - **Project URL** (e.g., `https://xxxxxxxxxxxxx.supabase.co`)
   - **anon public** key (under "Project API keys")
   - **service_role** key (under "Project API keys" - keep this secret!)

## Step 2: Get Anthropic API Key

1. Go to [https://console.anthropic.com](https://console.anthropic.com)
2. Sign in or create account
3. Go to **API Keys**
4. Click **"Create Key"**
5. Copy the key (starts with `sk-ant-`)
6. **Important**: Add credits to your account if needed

## Step 3: Deploy to Vercel

### 3.1 Initial Setup

1. Go to [https://vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click **"Add New"** → **"Project"**
4. Import your repository: `kilroy-kilroy/wtf-os`
5. Select the branch: `claude/wtf-growth-os-phase1-01Ajrx1nBC9uQu9WEhP1FX7J`

### 3.2 Configure Build Settings

Vercel should auto-detect Next.js and Turborepo. Verify:

- **Framework Preset**: Next.js
- **Root Directory**: `apps/web` ✅ (Important!)
- **Build Command**: `cd ../.. && npx turbo build --filter=web`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

### 3.3 Add Environment Variables

Before deploying, click **"Environment Variables"** and add:

```bash
# Supabase (from Step 1.3)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Anthropic (from Step 2)
ANTHROPIC_API_KEY=sk-ant-your-key-here

# App Config
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NODE_ENV=production
```

**Important Notes:**
- For `NEXT_PUBLIC_APP_URL`, use your Vercel domain (you'll get this after first deploy, or set a custom domain)
- You can initially use `https://your-project.vercel.app` as a placeholder
- Make sure to select **"Production"** environment for all variables

### 3.4 Deploy

1. Click **"Deploy"**
2. Wait 2-3 minutes for build to complete
3. You should see "Congratulations! Your deployment is ready." ✅

## Step 4: Test Your Deployment

1. Click **"Visit"** to open your deployed app
2. Navigate to `/call-lab`
3. Submit a test transcript with your email
4. Verify you receive the analysis results

### Sample Test Transcript

Use this if you need a quick test:

```
Sales Rep: Hi, thanks for taking the time today. I wanted to learn more about your current marketing challenges.

Prospect: Sure, happy to chat. We're struggling to get consistent leads right now.

Sales Rep: I hear that a lot. How many leads are you currently getting per month?

Prospect: Maybe 20-30, but the quality varies a lot.

Sales Rep: Got it. And what would success look like for you?

Prospect: Ideally, we'd be at 100+ qualified leads per month.

Sales Rep: That makes sense. What have you tried so far?

Prospect: We've tried some SEO and a bit of paid ads, but nothing consistent.

Sales Rep: Okay, and what's your timeline for making a decision on this?

Prospect: We'd like to have something in place by end of quarter.

Sales Rep: Perfect. Let me show you how we've helped similar companies...
```

## Step 5: Post-Deployment Configuration

### 5.1 Set Custom Domain (Optional)

1. In Vercel project settings, go to **Domains**
2. Add your custom domain
3. Update `NEXT_PUBLIC_APP_URL` environment variable to match

### 5.2 Update CORS Settings (If Needed)

If you encounter CORS issues with Supabase:

1. Go to Supabase **Settings** → **API**
2. Scroll to **API Settings**
3. Add your Vercel domain to **Site URL**

### 5.3 Monitor Usage

**Supabase Free Tier Limits:**
- Database: 500 MB
- Storage: 1 GB
- API requests: 50,000/month

**Anthropic API:**
- Monitor usage in console
- Set up billing alerts
- Average cost per call: ~$0.10-0.30

## Troubleshooting

### Build Fails with "Cannot find module '@repo/db'"

**Solution**: Make sure Root Directory is set to `apps/web` in Vercel settings.

### "Missing Supabase environment variables"

**Solution**: Verify all environment variables are set in Vercel project settings and are available to Production environment.

### Database Connection Errors

**Solutions:**
1. Verify your Supabase project is not paused (check dashboard)
2. Confirm the schema was run successfully
3. Check that `SUPABASE_SERVICE_ROLE_KEY` is correct

### AI Analysis Fails

**Solutions:**
1. Verify Anthropic API key is valid
2. Check you have credits in your Anthropic account
3. Look at Vercel function logs for specific errors

### Function Timeout

If analysis takes too long (>10 seconds on free tier):
1. Upgrade to Vercel Pro for 60-second timeouts
2. Or optimize prompts to be more concise

## Architecture on Vercel

```
Vercel Deployment
├── Next.js App (apps/web)
│   ├── API Routes (/api/*)
│   │   ├── /api/ingest/transcript
│   │   └── /api/analyze/call
│   └── Pages (/call-lab, /dashboard)
│
├── Packages (transpiled during build)
│   ├── @repo/db (Supabase client)
│   ├── @repo/prompts (AI prompts)
│   └── @repo/utils (utilities)
│
└── External Services
    ├── Supabase (PostgreSQL database)
    └── Anthropic (Claude API)
```

## Environment Variables Checklist

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `ANTHROPIC_API_KEY`
- [ ] `NEXT_PUBLIC_APP_URL`
- [ ] `NODE_ENV=production`

## Next Steps After Deployment

1. **Test thoroughly** with various transcripts
2. **Monitor costs** in Anthropic console
3. **Set up analytics** (optional - Vercel Analytics)
4. **Configure alerts** for errors in Vercel
5. **Plan Phase 2** features (email, PDF, auth)

## Quick Deploy Commands

If you need to redeploy after changes:

```bash
# Push changes to GitHub
git add .
git commit -m "Your changes"
git push

# Vercel will auto-deploy from your branch
# Or trigger manually in Vercel dashboard
```

## Support

- **Vercel Docs**: https://vercel.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **Anthropic Docs**: https://docs.anthropic.com

---

**Deployment Complete!** 🚀

Your WTF Growth OS Call Lab should now be live and ready to analyze sales calls!
