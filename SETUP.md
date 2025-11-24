# WTF Growth OS - Setup Guide

## Prerequisites

- Node.js 18+ installed
- npm or pnpm package manager
- Supabase account (free tier works)
- Anthropic API key (for Claude)
- Optional: OpenAI API key (for GPT)

## Step 1: Install Dependencies

```bash
npm install
```

This will install all dependencies for the monorepo, including:
- Next.js 14+
- Supabase client
- Anthropic SDK
- OpenAI SDK
- ShadCN UI components
- And all other dependencies

## Step 2: Set Up Supabase

### 2.1 Create a New Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign in or create an account
3. Click "New Project"
4. Fill in project details:
   - Name: `wtf-growth-os` (or your preferred name)
   - Database Password: (create a strong password)
   - Region: (choose closest to you)
5. Click "Create new project"

### 2.2 Run Database Migrations

1. Once your project is created, go to the SQL Editor
2. Open the file `packages/db/schema.sql` from this repository
3. Copy the entire contents
4. Paste into the SQL Editor in Supabase
5. Click "Run" to execute the schema
6. You should see "Success. No rows returned" - this is correct!

### 2.3 Get Your API Keys

1. In Supabase, go to Settings → API
2. Copy the following values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public** key (under "Project API keys")
   - **service_role** key (under "Project API keys")

⚠️ **Important**: Never commit the `service_role` key to version control!

## Step 3: Get AI API Keys

### Anthropic (Required for Call Lab)

1. Go to [https://console.anthropic.com](https://console.anthropic.com)
2. Sign in or create an account
3. Go to API Keys
4. Click "Create Key"
5. Copy your API key (starts with `sk-ant-`)

### OpenAI (Optional)

1. Go to [https://platform.openai.com](https://platform.openai.com)
2. Sign in or create an account
3. Go to API Keys
4. Click "Create new secret key"
5. Copy your API key (starts with `sk-`)

## Step 4: Configure Environment Variables

1. Copy the example environment file:

```bash
cp .env.example .env
```

2. Edit `.env` and fill in your values:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI
ANTHROPIC_API_KEY=sk-ant-your-key
OPENAI_API_KEY=sk-your-key  # Optional

# Email (optional for Phase 1)
RESEND_API_KEY=re_your-key
EMAIL_FROM=calllab@yourdomain.com

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

## Step 5: Run the Development Server

```bash
npm run dev
```

This will start:
- Next.js development server on http://localhost:3000

## Step 6: Test Call Lab

1. Open your browser to http://localhost:3000
2. Click "Try Call Lab Lite"
3. Fill in your email and paste a sample transcript
4. Click "Analyze Call"
5. You should see the analysis results!

## Sample Transcript for Testing

If you don't have a real transcript, use this sample:

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

## Troubleshooting

### Database Connection Issues

- Double-check your Supabase URL and keys in `.env`
- Make sure you ran the schema migrations
- Check that your Supabase project is active (not paused)

### AI API Issues

- Verify your Anthropic API key is correct
- Check that you have credits available in your Anthropic account
- Look for rate limit errors in the console

### Module Not Found Errors

- Try deleting `node_modules` and running `npm install` again
- Make sure you're in the root directory when running commands
- Check that all workspace packages are properly linked

## Next Steps

Once you have the basic setup working:

1. **Test with real transcripts**: Try analyzing actual sales calls
2. **Customize prompts**: Edit the prompts in `packages/prompts/` to match your needs
3. **Set up email**: Add Resend integration to email results
4. **Deploy**: Consider deploying to Vercel for production use

## Architecture Overview

```
wtf-growth-os/
├── apps/
│   └── web/                    # Next.js app
│       ├── app/
│       │   ├── call-lab/       # Call Lab UI
│       │   ├── dashboard/      # Dashboard
│       │   └── api/            # API routes
│       └── components/         # UI components
├── packages/
│   ├── db/                     # Database client & queries
│   ├── prompts/                # AI prompts
│   └── utils/                  # Shared utilities
```

## Support

For issues or questions:
1. Check the main README.md for architecture details
2. Review the handoff document for implementation details
3. Open an issue on GitHub

## Phase 1 Complete! ✅

You now have:
- ✅ Working Call Lab Lite
- ✅ Database with all tables
- ✅ API routes for ingestion and analysis
- ✅ Modern UI with Next.js 14 and ShadCN
- ✅ Model-agnostic AI integration

**Coming in Phase 2:**
- Full Call Lab version
- Rep trend tracking
- PDF reports
- Email integration
- Authentication
- CRM integrations
