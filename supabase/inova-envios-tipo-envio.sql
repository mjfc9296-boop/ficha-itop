alter table public.inova_blocos_envios
 add column tipo_envio text not null default 'venda'
 check (tipo_envio in ('venda', 'bonificacao'));

alter table public.inova_blocos_envios
 alter column valor_total_centavos set expression as (
  case when tipo_envio = 'bonificacao' then 0::bigint
       else quantidade::bigint * valor_unitario_centavos
  end
 );

grant insert (tipo_envio) on public.inova_blocos_envios to authenticated;
