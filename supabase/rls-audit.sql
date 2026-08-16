-- Run in Supabase SQL Editor. Rows returned here need review before Render is disabled.
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('products','customers','inventory','inventory_movements','invoices','invoice_line_items','user_profiles')
order by tablename;

select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('products','customers','inventory','inventory_movements','invoices','invoice_line_items','user_profiles')
order by tablename, policyname;

-- Every listed table should show rowsecurity=true and policies appropriate to
-- admin, manager and sales_rep. Do not expose the service-role key in React.
