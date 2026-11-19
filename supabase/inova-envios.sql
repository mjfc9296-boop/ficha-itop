create table public.inova_blocos_envios (
  id uuid primary key default gen_random_uuid(),
  cliente text not null check (char_length(btrim(cliente)) between 1 and 150),
  documento text not null check (documento ~ '^([0-9]{11}|[A-Z0-9]{12}[0-9]{2})$'),
  cep text not null check (cep ~ '^[0-9]{8}$'),
  endereco text not null check (char_length(btrim(endereco)) between 1 and 400),
  tipo_entrega text not null check (tipo_entrega in ('propria', 'terceirizada')),
  data_entrega date not null,
  item text not null check (item ~ '^(bloco|espacador)_(10|13|15|20)$'),
  quantidade integer not null check (quantidade between 1 and 999999),
  valor_unitario_centavos integer not null check (valor_unitario_centavos between 0 and 99999999),
  valor_total_centavos bigint generated always as (quantidade::bigint * valor_unitario_centavos) stored,
  criado_em timestamptz not null default now()
);

create index inova_blocos_envios_ordem
  on public.inova_blocos_envios (data_entrega desc, id desc);

alter table public.inova_blocos_envios enable row level security;
revoke all on public.inova_blocos_envios from public, anon, authenticated;
grant select on public.inova_blocos_envios to authenticated;
grant insert (cliente, documento, cep, endereco, tipo_entrega, data_entrega, item, quantidade, valor_unitario_centavos)
  on public.inova_blocos_envios to authenticated;

create policy "Admins aprovados consultam envios"
  on public.inova_blocos_envios for select to authenticated
  using (exists (
    select 1 from public.perfis
    where id = (select auth.uid()) and papel = 'administrador'
      and ativo and status_aprovacao = 'aprovado'
  ));

create policy "Admins aprovados cadastram envios"
  on public.inova_blocos_envios for insert to authenticated
  with check (exists (
    select 1 from public.perfis
    where id = (select auth.uid()) and papel = 'administrador'
      and ativo and status_aprovacao = 'aprovado'
  ));
