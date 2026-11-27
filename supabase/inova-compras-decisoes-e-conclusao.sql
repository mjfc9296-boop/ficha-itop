-- Aplicar após inova-compras-criar-com-orcamentos.sql.
begin;

create function public.inova_compras_e_administrador()
returns boolean
language sql stable security invoker
set search_path = ''
as $$
 select lower((select auth.jwt()->>'email')) = 'mjfc9296@gmail.com'
  and exists (
   select 1 from public.perfis where id = (select auth.uid())
    and papel = 'administrador' and ativo and status_aprovacao = 'aprovado'
  );
$$;
revoke all on function public.inova_compras_e_administrador() from public;
grant execute on function public.inova_compras_e_administrador() to authenticated;

create table public.inova_compras_decisoes (
 pedido_id uuid primary key references public.inova_compras(id),
 resultado text not null check (resultado in ('aprovado', 'reprovado')),
 orcamento_id uuid references public.inova_compras_orcamentos(id),
 decidido_por uuid not null default auth.uid(),
 decidido_em timestamptz not null default now(),
 check (resultado = 'reprovado' or orcamento_id is not null)
);
create table public.inova_compras_conclusoes (
 pedido_id uuid primary key references public.inova_compras(id),
 comprovante text not null,
 nota_fiscal text not null,
 concluido_em timestamptz not null default now()
);
alter table public.inova_compras_decisoes enable row level security;
alter table public.inova_compras_conclusoes enable row level security;
revoke all on public.inova_compras_decisoes, public.inova_compras_conclusoes from public, anon, authenticated;
grant select, insert (pedido_id, resultado, orcamento_id) on public.inova_compras_decisoes to authenticated;
grant select, insert (pedido_id, comprovante, nota_fiscal) on public.inova_compras_conclusoes to authenticated;

create policy "Inova consulta decisões" on public.inova_compras_decisoes
 for select to authenticated using ((select public.inova_compras_e_administrador()));
create policy "Inova decide pedidos encaminhados" on public.inova_compras_decisoes
 for insert to authenticated with check (
  (select public.inova_compras_e_administrador())
  and exists (
   select 1 from public.inova_compras p
   where p.id = inova_compras_decisoes.pedido_id and p.enviado_para_aprovacao_em is not null
    and (
     inova_compras_decisoes.orcamento_id is null
     or exists (
      select 1 from public.inova_compras_orcamentos o
      where o.id = inova_compras_decisoes.orcamento_id and o.pedido_id = p.id
       and o.posicao between 1 and (case when p.fornecedor_exclusivo then 1 else 3 end)
       and (inova_compras_decisoes.resultado = 'reprovado' or not exists (
        select 1 from jsonb_array_elements(o.itens) item where item->>'valor_centavos' is null
       ))
     )
    )
  )
 );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('inova-compras-documentos', 'inova-compras-documentos', false, 10485760,
        array['application/pdf','image/jpeg','image/png','application/xml','text/xml']);

create policy "Inova consulta arquivos de compras" on storage.objects
 for select to authenticated using (
  bucket_id = 'inova-compras-documentos' and (select public.inova_compras_e_administrador())
 );
create policy "Inova anexa arquivos ao pedido aprovado" on storage.objects
 for insert to authenticated with check (
  bucket_id = 'inova-compras-documentos' and (select public.inova_compras_e_administrador())
  and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/(comprovante|nota_fiscal)\.(pdf|jpg|png|xml)$'
  and exists (
   select 1 from public.inova_compras_decisoes d
   where d.pedido_id::text = split_part(name, '/', 1) and d.resultado = 'aprovado'
    and not exists (select 1 from public.inova_compras_conclusoes c where c.pedido_id = d.pedido_id)
  )
 );
create policy "Inova limpa arquivos de tentativa incompleta" on storage.objects
 for delete to authenticated using (
  bucket_id = 'inova-compras-documentos' and (select public.inova_compras_e_administrador())
  and not exists (select 1 from public.inova_compras_conclusoes c where name in (c.comprovante, c.nota_fiscal))
 );
create policy "Inova consulta pedidos concluídos" on public.inova_compras_conclusoes
 for select to authenticated using ((select public.inova_compras_e_administrador()));
create policy "Inova conclui pedidos aprovados com documentos" on public.inova_compras_conclusoes
 for insert to authenticated with check (
  (select public.inova_compras_e_administrador())
  and exists (
   select 1 from public.inova_compras_decisoes d where d.pedido_id = inova_compras_conclusoes.pedido_id and d.resultado = 'aprovado'
  )
  and comprovante ~ ('^' || pedido_id::text || '/[0-9a-f-]{36}/comprovante\.(pdf|jpg|png|xml)$')
  and nota_fiscal ~ ('^' || pedido_id::text || '/[0-9a-f-]{36}/nota_fiscal\.(pdf|jpg|png|xml)$')
  and split_part(comprovante, '/', 2) = split_part(nota_fiscal, '/', 2)
  and (
   select count(*) from storage.objects o where o.bucket_id = 'inova-compras-documentos' and o.name in (comprovante, nota_fiscal)
  ) = 2
 );

notify pgrst, 'reload schema';
commit;
