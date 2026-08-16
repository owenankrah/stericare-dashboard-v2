# Pharma-C BMS: Remove the Render backend

This package converts the dashboard to a browser-first Supabase architecture.
The React app remains on Vercel; ordinary data operations go directly to
Supabase; privileged user creation runs in a Supabase Edge Function.

## Included changes

- Replaces `src/lib/api.js` with Supabase-backed functions while preserving the
  existing exported function names.
- Generates invoice and inventory PDFs/CSVs in the browser.
- Removes the Render keep-alive call and visible backend status indicator.
- Replaces the Invoice List Render PDF request.
- Adds `admin-create-user`, which verifies that the caller is an active admin
  before using the service role.
- Adds database functions for dashboard analytics and revenue trends.
- Adds a read-only RLS audit query.

## 1. Back up and create a branch

```bash
git switch -c remove-render-backend
```

Copy the package contents into the root of `stericare-dashboard-v2`, preserving
the directory structure.

## 2. Check Row Level Security first

Open Supabase Dashboard > SQL Editor and run:

```text
supabase/rls-audit.sql
```

Confirm that RLS is enabled for every listed table and that the policies match
your admin, manager and sales-representative permissions. Do not proceed if a
user can read or change records outside their role.

## 3. Apply the database migration

Using the Supabase CLI:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Alternatively, paste
`supabase/migrations/20260816_browser_first_functions.sql` into SQL Editor and
run it.

## 4. Deploy the privileged function

```bash
supabase functions deploy admin-create-user
```

The hosted function receives `SUPABASE_URL`, `SUPABASE_ANON_KEY` and
`SUPABASE_SERVICE_ROLE_KEY` from Supabase. Never add the service-role key to
React or Vercel.

## 5. Configure Vercel

Keep only these browser-safe variables:

```text
REACT_APP_SUPABASE_URL
REACT_APP_SUPABASE_ANON_KEY
```

Remove `REACT_APP_API_URL` after the new deployment passes testing.

## 6. Test before disabling Render

Run locally:

```bash
npm ci
npm run build
npm start
```

Smoke-test with an admin and a sales representative:

- Sign in, sign out and password reset.
- Products and customers load and save.
- Invoices list, open and download as PDF.
- Inventory loads, adjusts and exports.
- Admin can create a user; non-admin cannot.
- Sales representatives only see records allowed by RLS.
- Analytics pages load.

Deploy the branch to a Vercel preview and repeat the tests there.

## 7. Cut over

Merge and deploy the branch. Leave Render available for 24-48 hours as a
rollback option, but remove `REACT_APP_API_URL` so no production traffic uses
it. Once logs and user testing are clean, suspend the Render service and archive
the old backend repository.

## Rollback

Restore the previous Vercel deployment and restore `REACT_APP_API_URL`. The
database migration only adds read-only functions, so it does not need to be
reversed during an emergency rollback.

## Validation note

The code was statically checked in the generated package. A full dependency
install could not complete in the packaging environment because its npm cache
was unavailable; run `npm ci && npm run build` in your normal development or
Vercel environment before production cutover.
