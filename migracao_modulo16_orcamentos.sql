-- Ficha ITOP · Módulo 16 · executar no SQL Editor do Supabase antes de publicar o HTML
create table if not exists public.itop_orcamentos_uvi (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 cliente_nome text not null,
 cliente_telefone text,
 cliente_cidade text,
 consultor_nome text,
 produtos jsonb not null default '[]'::jsonb,
 valor_mensal numeric(12,2) not null default 0,
 retorno_em timestamptz,
 observacoes text,
 origem text not null default 'uvi_modulo_16' check (origem = 'uvi_modulo_16'),
 status text not null default 'venda_em_espera' check (status = 'venda_em_espera'),
 is_test boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists itop_orcamentos_uvi_user_created_idx on public.itop_orcamentos_uvi(user_id,created_at desc);
create index if not exists itop_orcamentos_uvi_retorno_idx on public.itop_orcamentos_uvi(retorno_em) where retorno_em is not null;
alter table public.itop_orcamentos_uvi enable row level security;
drop policy if exists itop_orcamentos_uvi_own_select on public.itop_orcamentos_uvi;
create policy itop_orcamentos_uvi_own_select on public.itop_orcamentos_uvi for select to authenticated using (auth.uid()=user_id);
drop policy if exists itop_orcamentos_uvi_own_insert on public.itop_orcamentos_uvi;
create policy itop_orcamentos_uvi_own_insert on public.itop_orcamentos_uvi for insert to authenticated with check (auth.uid()=user_id);
drop policy if exists itop_orcamentos_uvi_own_update on public.itop_orcamentos_uvi;
create policy itop_orcamentos_uvi_own_update on public.itop_orcamentos_uvi for update to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);
-- Indicadores comerciais: não conte esta tabela como vendas fechadas.
-- Orçamentos de teste: filtrar is_test = false nos relatórios de vendas em espera.
-- A política atual limita consulta ao criador. Visibilidade de supervisores/ADM requer
-- vinculação segura às carteiras e regras de autorização existentes no banco.
