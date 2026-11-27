begin;

alter table public.inova_compras_orcamentos
 add column posicao smallint check (posicao is null or (posicao between 1 and 3 and pedido_id is not null)),
 add column link text check (length(link) <= 2048 and link ~* '^https?://');

with numerados as (
 select id, row_number() over (partition by pedido_id order by criado_em, id) as ordem
 from public.inova_compras_orcamentos
 where pedido_id is not null
)
update public.inova_compras_orcamentos as orcamento
set posicao = numerados.ordem
from numerados
where numerados.id = orcamento.id and numerados.ordem <= 3;

create unique index inova_compras_orcamentos_pedido_posicao
 on public.inova_compras_orcamentos (pedido_id, posicao)
 where posicao is not null;

grant insert (posicao, link) on public.inova_compras_orcamentos to authenticated;
notify pgrst, 'reload schema';

commit;
