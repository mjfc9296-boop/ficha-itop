create table public.inova_compras_orcamentos (
 id uuid primary key,
 pedido_id uuid references public.inova_compras(id),
 fornecedor text not null check (length(btrim(fornecedor)) between 1 and 200),
 data_orcamento date not null,
 valido_ate date check (valido_ate >= data_orcamento),
 pagamento text check (pagamento in ('PIX', 'À vista', '30/60/90')),
 prazo_dias integer check (prazo_dias between 0 and 3650),
 frete_centavos integer not null check (frete_centavos >= 0),
 itens jsonb not null check (jsonb_typeof(itens) = 'array' and jsonb_array_length(itens) between 1 and 100),
 observacoes text not null default '' check (length(observacoes) <= 2000),
 criado_em timestamptz not null default now()
);
alter table public.inova_compras_orcamentos enable row level security;
revoke all on public.inova_compras_orcamentos from public, anon, authenticated;
grant select, insert (id, pedido_id, fornecedor, data_orcamento, valido_ate, pagamento, prazo_dias, frete_centavos, itens, observacoes)
 on public.inova_compras_orcamentos to authenticated;
create policy "Painel Inova acessa orçamentos" on public.inova_compras_orcamentos
 for all to authenticated using (
  lower((select auth.jwt()->>'email')) = 'mjfc9296@gmail.com'
  and exists (select 1 from public.perfis where id = (select auth.uid()) and papel = 'administrador' and ativo and status_aprovacao = 'aprovado')
 );
