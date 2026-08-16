# Pharma-C Business Management System

Complete browser-first React and Supabase application for Pharma-C Medical
Supplies. The application includes analytics, sales and invoicing, inventory,
CRM, deal pipeline, user management, customer groups, contract pricing and
promotional price lists.

The former always-on Render backend is no longer required. Browser-safe CRUD
uses Supabase directly; privileged user creation runs in a Supabase Edge
Function.

## Requirements

- Node.js 20 or newer (Node 23 also works for local development)
- npm 10 or newer
- A Supabase project
- Supabase CLI only when deploying the Edge Function from the terminal

## 1. Configure the frontend

Copy the environment template:

```bash
cp .env.example .env
```

Enter the URL and browser-safe anon key from **Supabase Dashboard → Project
Settings → API**:

```env
REACT_APP_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
REACT_APP_SUPABASE_ANON_KEY=YOUR_BROWSER_SAFE_ANON_KEY
```

Never place the service-role key in `.env` or any React source file.

## 2. Configure the database

Run the following files in the Supabase SQL editor in this order:

1. `supabase/migrations/20260816_browser_first_functions.sql`
2. `supabase/migrations/20260816173000_customer_price_lists.sql`
3. `supabase/migrations/20260816190000_unified_pricing.sql`

The price-list migrations are idempotent and can upgrade the existing project.
Do not run old examples containing placeholder UUID values.

After the database migration, follow `CHAG_PRICE_LIST_SETUP.md` from inside the
application package. CHAG facilities can be added gradually as customers are
obtained; they do not need to be preloaded.

## 3. Deploy the user-creation Edge Function

Deploy `supabase/functions/admin-create-user` through the Supabase Dashboard or:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase functions deploy admin-create-user --no-verify-jwt
```

The function handles CORS and validates the caller's authenticated admin role
internally.

## 4. Run locally

```bash
npm install
npm start
```

Open `http://localhost:3000`.

## 5. Create a production build

```bash
npm run build
```

The deployable static output is written to `build/`.

## Vercel deployment

Set the two `REACT_APP_SUPABASE_*` environment variables in Vercel and use:

- Build command: `npm run build`
- Output directory: `build`

The project is a client-side routed React application. Ensure Vercel rewrites
unknown paths to `/index.html` if deep links return 404.

## Pricing workflow

Administrators and managers can open **Pricing Management** to:

- Create customer groups such as CHAG Facilities.
- Create contract, promotion or custom price lists.
- Enter product prices and quantity tiers.
- Assign lists to a group or an individual customer.
- Set dates, priority and active status.

Lower priority numbers win. A promotion at priority `10` can temporarily
override a contract at priority `20`. Invoice lines snapshot the applied price
and price-list source so historical invoices do not change later.

## Security

- Keep `.env`, `src/.env`, service-role keys and local Supabase state out of Git.
- Use the anon key in the browser; Row-Level Security controls access.
- Price-list administration is restricted to admin and manager roles.
- Contract prices are locked for sales representatives.
- Run `supabase/rls-audit.sql` after schema changes to review table protection.

## Recommended smoke test

1. Sign in and open every application card.
2. Create a customer and assign a customer group.
3. Create a deal and confirm it appears in the pipeline.
4. Create a price list, add a product and assign it to the group.
5. Create an invoice and verify the price source and stock level.
6. Change quantity and verify quantity-tier repricing.
7. Download and print the invoice.
8. Create a user as an administrator.
