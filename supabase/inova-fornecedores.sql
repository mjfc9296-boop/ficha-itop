create table public.inova_blocos_fornecedores (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(btrim(nome)) between 1 and 160),
  telefone text check (char_length(telefone) <= 40),
  endereco text check (char_length(endereco) <= 300),
  cnpj text unique check (cnpj ~ '^[A-Z0-9]{12}[0-9]{2}$'),
  segmento text check (char_length(segmento) <= 120),
  observacao text check (char_length(observacao) <= 2000),
  criado_em timestamptz not null default now()
);

create index inova_blocos_fornecedores_ordem
  on public.inova_blocos_fornecedores (criado_em desc, id desc);

alter table public.inova_blocos_fornecedores enable row level security;
revoke all on public.inova_blocos_fornecedores from public, anon, authenticated;
grant select on public.inova_blocos_fornecedores to authenticated;
grant insert (nome, telefone, endereco, cnpj, segmento, observacao)
  on public.inova_blocos_fornecedores to authenticated;

create policy "Admins aprovados consultam fornecedores"
  on public.inova_blocos_fornecedores for select to authenticated
  using (exists (
    select 1 from public.perfis
    where id = (select auth.uid()) and papel = 'administrador'
      and ativo and status_aprovacao = 'aprovado'
  ));

create policy "Admins aprovados cadastram fornecedores"
  on public.inova_blocos_fornecedores for insert to authenticated
  with check (exists (
    select 1 from public.perfis
    where id = (select auth.uid()) and papel = 'administrador'
      and ativo and status_aprovacao = 'aprovado'
  ));
