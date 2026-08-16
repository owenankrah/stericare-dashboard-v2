-- Unified pricing upgrade. Run after 20260816173000_customer_price_lists.sql.
-- This is intentionally idempotent for projects where the base migration already ran.

alter table public.customer_groups add column if not exists updated_at timestamptz not null default now();
alter table public.customer_group_members add column if not exists is_active boolean not null default true;
alter table public.customer_group_members add column if not exists valid_from date;
alter table public.customer_group_members add column if not exists valid_until date;
alter table public.customer_group_members add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.price_list_assignments add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.price_list_assignments add column if not exists updated_at timestamptz not null default now();
alter table public.invoice_line_items add column if not exists price_list_type text;
alter table public.invoice_line_items add column if not exists price_assignment_type text;

create table if not exists public.pricing_audit_log (
  id bigint generated always as identity primary key,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  previous_data jsonb,
  new_data jsonb,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now()
);

alter table public.pricing_audit_log enable row level security;
drop policy if exists pricing_audit_read on public.pricing_audit_log;
create policy pricing_audit_read on public.pricing_audit_log for select to authenticated
  using (public.current_role() in ('admin','manager'));

create or replace function public.touch_pricing_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.log_pricing_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.pricing_audit_log(entity_type, entity_id, action, previous_data, new_data, changed_by)
  values (tg_table_name, coalesce((to_jsonb(new)->>'id')::uuid, (to_jsonb(old)->>'id')::uuid), tg_op,
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end,
    auth.uid());
  return coalesce(new, old);
end;
$$;

drop trigger if exists customer_groups_touch_pricing on public.customer_groups;
create trigger customer_groups_touch_pricing before update on public.customer_groups
for each row execute function public.touch_pricing_updated_at();
drop trigger if exists price_lists_touch_pricing on public.price_lists;
create trigger price_lists_touch_pricing before update on public.price_lists
for each row execute function public.touch_pricing_updated_at();
drop trigger if exists price_list_items_touch_pricing on public.price_list_items;
create trigger price_list_items_touch_pricing before update on public.price_list_items
for each row execute function public.touch_pricing_updated_at();
drop trigger if exists price_list_assignments_touch_pricing on public.price_list_assignments;
create trigger price_list_assignments_touch_pricing before update on public.price_list_assignments
for each row execute function public.touch_pricing_updated_at();

do $$
declare table_name text;
begin
  foreach table_name in array array['customer_groups','customer_group_members','price_lists','price_list_items','price_list_assignments']
  loop
    execute format('drop trigger if exists %I on public.%I', table_name || '_pricing_audit', table_name);
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.log_pricing_change()', table_name || '_pricing_audit', table_name);
  end loop;
end $$;

drop function if exists public.resolve_customer_product_price(uuid, uuid, integer, date);
create function public.resolve_customer_product_price(
  p_customer_id uuid,
  p_product_id uuid,
  p_quantity integer default 1,
  p_on_date date default current_date
)
returns table(
  unit_price numeric,
  price_list_id uuid,
  price_list_name text,
  price_list_type text,
  assignment_type text,
  is_price_locked boolean
)
language sql stable security invoker set search_path = public as $$
  with eligible_assignments as (
    select
      a.price_list_id,
      a.priority as assignment_priority,
      case when a.customer_id is not null then 'customer' else 'group' end as assignment_type,
      case when a.customer_id is not null then 0 else 1 end as target_rank
    from price_list_assignments a
    where a.is_active
      and (a.valid_from is null or a.valid_from <= p_on_date)
      and (a.valid_until is null or a.valid_until >= p_on_date)
      and (
        a.customer_id = p_customer_id
        or exists (
          select 1 from customer_group_members gm
          where gm.customer_id = p_customer_id
            and gm.group_id = a.customer_group_id
            and gm.is_active
            and (gm.valid_from is null or gm.valid_from <= p_on_date)
            and (gm.valid_until is null or gm.valid_until >= p_on_date)
        )
      )
  ), custom_price as (
    select
      pli.unit_price,
      pl.id as price_list_id,
      pl.name as price_list_name,
      pl.list_type as price_list_type,
      ea.assignment_type,
      (pl.list_type = 'contract') as is_price_locked
    from eligible_assignments ea
    join price_lists pl on pl.id = ea.price_list_id
    join price_list_items pli on pli.price_list_id = pl.id and pli.product_id = p_product_id
    where pl.is_active
      and pli.min_quantity <= greatest(coalesce(p_quantity, 1), 1)
      and (pl.valid_from is null or pl.valid_from <= p_on_date)
      and (pl.valid_until is null or pl.valid_until >= p_on_date)
    order by ea.assignment_priority asc, pl.priority asc, ea.target_rank asc,
      case pl.list_type when 'promotion' then 0 when 'contract' then 1 else 2 end,
      pli.min_quantity desc
    limit 1
  )
  select * from custom_price
  union all
  select coalesce(p.selling_price, 0)::numeric, null::uuid, 'Standard price'::text,
    'standard'::text, 'default'::text, false
  from products p
  where p.id = p_product_id and not exists (select 1 from custom_price)
  limit 1;
$$;

grant execute on function public.resolve_customer_product_price(uuid, uuid, integer, date) to authenticated;

create or replace view public.customer_effective_price_lists
with (security_invoker = true) as
select distinct
  c.id as customer_id,
  c.name as customer_name,
  pl.id as price_list_id,
  pl.name as price_list_name,
  pl.list_type,
  a.priority,
  case when a.customer_id is not null then 'customer' else 'group' end as assignment_type,
  g.name as customer_group_name,
  greatest(pl.valid_from, a.valid_from) as effective_from,
  least(pl.valid_until, a.valid_until) as effective_until
from public.customers c
join public.price_list_assignments a on a.is_active and (
  a.customer_id = c.id or exists (
    select 1 from public.customer_group_members gm
    where gm.customer_id = c.id and gm.group_id = a.customer_group_id and gm.is_active
  )
)
join public.price_lists pl on pl.id = a.price_list_id and pl.is_active
left join public.customer_groups g on g.id = a.customer_group_id;

grant select on public.customer_effective_price_lists to authenticated;
