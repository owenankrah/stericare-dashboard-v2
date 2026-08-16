-- Read-only aggregations replace the former Express analytics endpoints.
create or replace function public.dashboard_analytics()
returns jsonb language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'totalCustomers', (select count(*) from public.customers),
    'totalInvoices', (select count(*) from public.invoices),
    'totalRevenue', (select coalesce(sum(total_amount), 0) from public.invoices),
    'totalProducts', (select count(*) from public.products),
    'generatedAt', now()
  );
$$;

create or replace function public.revenue_trends()
returns table(month date, revenue numeric, invoice_count bigint)
language sql stable security invoker set search_path = public as $$
  select date_trunc('month', invoice_date)::date,
         coalesce(sum(total_amount), 0)::numeric,
         count(*)
  from public.invoices
  group by 1 order by 1;
$$;

revoke all on function public.dashboard_analytics() from public;
revoke all on function public.revenue_trends() from public;
grant execute on function public.dashboard_analytics() to authenticated;
grant execute on function public.revenue_trends() to authenticated;
