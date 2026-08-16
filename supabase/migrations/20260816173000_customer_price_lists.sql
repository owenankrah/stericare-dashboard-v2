-- Reusable contract, customer-group, and promotional pricing.
-- Safe to run more than once in an existing Supabase project.

create table if not exists public.customer_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_group_members (
  group_id uuid not null references public.customer_groups(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (group_id, customer_id)
);

create table if not exists public.price_lists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  description text,
  list_type text not null default 'custom' check (list_type in ('contract', 'promotion', 'custom')),
  currency text not null default 'GHS',
  valid_from date,
  valid_until date,
  priority integer not null default 100,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_until is null or valid_from is null or valid_until >= valid_from)
);

create table if not exists public.price_list_items (
  id uuid primary key default gen_random_uuid(),
  price_list_id uuid not null references public.price_lists(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  unit_price numeric(14,2) not null check (unit_price >= 0),
  min_quantity integer not null default 1 check (min_quantity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (price_list_id, product_id, min_quantity)
);

create table if not exists public.price_list_assignments (
  id uuid primary key default gen_random_uuid(),
  price_list_id uuid not null references public.price_lists(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete cascade,
  customer_group_id uuid references public.customer_groups(id) on delete cascade,
  valid_from date,
  valid_until date,
  priority integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check ((customer_id is not null)::integer + (customer_group_id is not null)::integer = 1),
  check (valid_until is null or valid_from is null or valid_until >= valid_from)
);

create unique index if not exists price_list_customer_assignment_uq
  on public.price_list_assignments(price_list_id, customer_id) where customer_id is not null;
create unique index if not exists price_list_group_assignment_uq
  on public.price_list_assignments(price_list_id, customer_group_id) where customer_group_id is not null;
create index if not exists price_list_items_lookup_idx on public.price_list_items(product_id, price_list_id, min_quantity desc);
create index if not exists customer_group_members_customer_idx on public.customer_group_members(customer_id, group_id);

alter table public.invoice_line_items add column if not exists price_list_id uuid references public.price_lists(id) on delete set null;
alter table public.invoice_line_items add column if not exists price_list_name text;

alter table public.customer_groups enable row level security;
alter table public.customer_group_members enable row level security;
alter table public.price_lists enable row level security;
alter table public.price_list_items enable row level security;
alter table public.price_list_assignments enable row level security;

drop policy if exists customer_groups_read on public.customer_groups;
create policy customer_groups_read on public.customer_groups for select to authenticated using (true);
drop policy if exists customer_groups_manage on public.customer_groups;
create policy customer_groups_manage on public.customer_groups for all to authenticated using (public.current_role() in ('admin','manager')) with check (public.current_role() in ('admin','manager'));
drop policy if exists customer_group_members_read on public.customer_group_members;
create policy customer_group_members_read on public.customer_group_members for select to authenticated using (true);
drop policy if exists customer_group_members_manage on public.customer_group_members;
create policy customer_group_members_manage on public.customer_group_members for all to authenticated using (public.current_role() in ('admin','manager')) with check (public.current_role() in ('admin','manager'));
drop policy if exists price_lists_read on public.price_lists;
create policy price_lists_read on public.price_lists for select to authenticated using (true);
drop policy if exists price_lists_manage on public.price_lists;
create policy price_lists_manage on public.price_lists for all to authenticated using (public.current_role() in ('admin','manager')) with check (public.current_role() in ('admin','manager'));
drop policy if exists price_list_items_read on public.price_list_items;
create policy price_list_items_read on public.price_list_items for select to authenticated using (true);
drop policy if exists price_list_items_manage on public.price_list_items;
create policy price_list_items_manage on public.price_list_items for all to authenticated using (public.current_role() in ('admin','manager')) with check (public.current_role() in ('admin','manager'));
drop policy if exists price_list_assignments_read on public.price_list_assignments;
create policy price_list_assignments_read on public.price_list_assignments for select to authenticated using (true);
drop policy if exists price_list_assignments_manage on public.price_list_assignments;
create policy price_list_assignments_manage on public.price_list_assignments for all to authenticated using (public.current_role() in ('admin','manager')) with check (public.current_role() in ('admin','manager'));

create or replace function public.resolve_customer_product_price(
  p_customer_id uuid,
  p_product_id uuid,
  p_quantity integer default 1,
  p_on_date date default current_date
)
returns table(unit_price numeric, price_list_id uuid, price_list_name text)
language sql
stable
security invoker
set search_path = public
as $$
  with eligible_assignments as (
    select a.price_list_id, a.priority
    from price_list_assignments a
    where a.is_active
      and (a.valid_from is null or a.valid_from <= p_on_date)
      and (a.valid_until is null or a.valid_until >= p_on_date)
      and (
        a.customer_id = p_customer_id
        or exists (
          select 1 from customer_group_members gm
          where gm.customer_id = p_customer_id and gm.group_id = a.customer_group_id
        )
      )
  ), custom_price as (
    select pli.unit_price, pl.id as price_list_id, pl.name as price_list_name
    from eligible_assignments ea
    join price_lists pl on pl.id = ea.price_list_id
    join price_list_items pli on pli.price_list_id = pl.id and pli.product_id = p_product_id
    where pl.is_active
      and pli.min_quantity <= greatest(coalesce(p_quantity, 1), 1)
      and (pl.valid_from is null or pl.valid_from <= p_on_date)
      and (pl.valid_until is null or pl.valid_until >= p_on_date)
    order by ea.priority asc, pl.priority asc, pli.min_quantity desc
    limit 1
  )
  select * from custom_price
  union all
  select coalesce(p.selling_price, 0)::numeric, null::uuid, 'Standard price'::text
  from products p
  where p.id = p_product_id and not exists (select 1 from custom_price)
  limit 1;
$$;

grant execute on function public.resolve_customer_product_price(uuid, uuid, integer, date) to authenticated;
