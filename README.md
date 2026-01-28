# WTF Growth OS

Phase 1: Core OS + Call Lab

## Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript (strict mode)
- **Database**: Supabase (PostgreSQL + Auth + Storage)
- **UI**: ShadCN UI + Tailwind CSS
- **Email**: Resend * Loops
- **AI**: Model-agnostic (Claude/GPT)
- **Monorepo**: Turborepo

## Structure

```
wtf-growth-os/
├── apps/
│   └── web/              # Next.js application
├── packages/
│   ├── db/               # Supabase client, types, queries
│   ├── prompts/          # AI prompts
│   ├── ui/               # Shared components
│   ├── utils/            # Shared utilities
│   └── pdf/              # PDF generation
```

## Getting Started

1. Copy `.env.example` to `.env` and fill in your values
2. Install dependencies: `npm install`
3. Run development server: `npm run dev`
4. Set up Supabase:
   - Create a new project at https://supabase.com
   - Run the schema migrations from `packages/db/schema.sql`
   - Copy your credentials to `.env`

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run linting
- `npm run type-check` - Check TypeScript types

## Phase 1 Features

- ✅ Core OS data spine (identity, companies, deals)
- ✅ Call Lab Lite (lead magnet)
- ✅ Call Lab Full (paid module)
- ✅ API routes for ingestion and extraction
- ✅ Email delivery via Resend
- ✅ PDF report generation

## Not in Phase 1

- Projects, Proof Items, Performance Metrics (Phase 2)
- Other Labs (Discovery, Angle, Content)
- Builders (Proposal, Case Study)
- CRM integrations
