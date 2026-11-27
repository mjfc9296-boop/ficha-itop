alter table public.inova_compras
 add column tipo_material text check (tipo_material in ('EPI', 'EPS', 'Suprimento', 'Patrimônio'));

grant insert (tipo_material) on public.inova_compras to authenticated;

create or replace function public.inova_criar_pedido_com_orcamentos(
 pedido jsonb, orcamentos jsonb, exclusivo boolean, aprovar boolean
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
 v_pedido_id uuid := (pedido->>'id')::uuid;
begin
 if nullif(btrim(pedido->>'solicitante'), '') is null then
  raise exception 'Informe o solicitante do pedido';
 end if;

 if jsonb_typeof(orcamentos) is distinct from 'array'
    or jsonb_array_length(orcamentos) > (case when exclusivo then 1 else 3 end)
    or exists (
      select 1 from jsonb_to_recordset(orcamentos) as q(posicao smallint)
      where q.posicao is null or q.posicao not between 1 and (case when exclusivo then 1 else 3 end)
    ) then
  raise exception 'Posições de orçamento inválidas';
 end if;

 insert into public.inova_compras (id, fornecedor, entrega, itens, observacoes, fornecedor_exclusivo, solicitante, prioridade, tipo_material)
 values (v_pedido_id, pedido->>'fornecedor', (pedido->>'entrega')::date,
         pedido->'itens', pedido->>'observacoes', exclusivo, btrim(pedido->>'solicitante'),
         coalesce(pedido->>'prioridade', 'normal'), nullif(pedido->>'tipo_material', ''))
 on conflict (id) do nothing;
 if not found then
  return;
 end if;

 insert into public.inova_compras_orcamentos
  (id, pedido_id, posicao, fornecedor, data_orcamento, valido_ate, pagamento,
   prazo_dias, frete_centavos, link, itens, observacoes)
 select q.id, v_pedido_id, q.posicao, q.fornecedor, q.data_orcamento, q.valido_ate, q.pagamento,
        q.prazo_dias, q.frete_centavos, q.link, q.itens, q.observacoes
 from jsonb_populate_recordset(null::public.inova_compras_orcamentos, orcamentos) as q;

 if aprovar then
  update public.inova_compras
  set enviado_para_aprovacao_em = now()
  where id = v_pedido_id;
  if not found then
   raise exception 'Não foi possível encaminhar o pedido para aprovação';
  end if;
 end if;
end;
$$;

notify pgrst, 'reload schema';
