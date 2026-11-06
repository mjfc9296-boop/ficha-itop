alter table public.itop_orcamentos_uvi
  add column cliente_documento text,
  add column cliente_whatsapp text,
  add column cliente_email text,
  add column cliente_endereco text,
  add column cliente_numero text,
  add column cliente_bairro text,
  add column emissao_data date,
  add column emissao_hora time without time zone,
  add column validade date,
  add column unidade text check (unidade in ('alfenas', 'machado', 'paraguacu', 'bh', 'ribeirao')),
  add column simulacao_energia jsonb;

revoke all on public.itop_orcamentos_uvi from anon;
revoke truncate on public.itop_orcamentos_uvi from authenticated;

create function public.itop_orcamento_uvi_fixar_emissao()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  pode_editar boolean;
  emissao timestamp without time zone;
begin
  select exists (
    select 1 from public.perfis
    where id = (select auth.uid())
      and ativo and status_aprovacao = 'aprovado'
      and papel in ('administrador', 'coordenador', 'supervisor')
  ) into pode_editar;

  if tg_op = 'INSERT' then
    emissao := statement_timestamp() at time zone 'America/Sao_Paulo';
    if not pode_editar then
      new.emissao_data := null;
      new.emissao_hora := null;
    end if;
    new.emissao_data := coalesce(new.emissao_data, emissao::date);
    new.emissao_hora := coalesce(new.emissao_hora, date_trunc('minute', emissao)::time);
  else
    emissao := old.created_at at time zone 'America/Sao_Paulo';
    if not pode_editar then
      new.emissao_data := old.emissao_data;
      new.emissao_hora := old.emissao_hora;
    end if;
    new.emissao_data := coalesce(new.emissao_data, old.emissao_data, emissao::date);
    new.emissao_hora := coalesce(new.emissao_hora, old.emissao_hora, date_trunc('minute', emissao)::time);
  end if;

  if new.validade < new.emissao_data then
    raise exception 'A validade não pode ser anterior à emissão.';
  end if;
  new.updated_at := statement_timestamp();
  return new;
end;
$$;

revoke execute on function public.itop_orcamento_uvi_fixar_emissao() from public;

create trigger itop_orcamento_uvi_emissao
before insert or update on public.itop_orcamentos_uvi
for each row execute function public.itop_orcamento_uvi_fixar_emissao();
