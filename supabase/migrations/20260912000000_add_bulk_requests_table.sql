
create table if not exists public.bulk_requests (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  country text not null,
  whatsapp_number text not null,
  quantity integer not null,
  products_requested jsonb not null,
  delivery_country text not null,
  delivery_city text not null,
  notes text,
  status text not null default 'New',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bulk_requests enable row level security;

-- Admin can view all
create policy "Admins can view all"
  on public.bulk_requests for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- Admin can manage all
create policy "Admins can manage all"
  on public.bulk_requests for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Anyone can insert
create policy "Anyone can insert"
  on public.bulk_requests for insert
  to anon, authenticated
  with check (true);
