# ITOP — Gestão Comercial

Integração ativada no projeto **ITOP SONDAGEM**, com autorização do proprietário. Hospedagem mantida no GitHub Pages e plano Supabase Free preservado. Sem contratação de serviços pagos.

## Uso

Na aba Sondagem, o bloco Registro comercial permite salvar rascunho, registrar a proposta apresentada, finalizar e recuperar a última versão sincronizada. O modo **TESTE** identifica simulações: ficam fora dos indicadores e relatórios de negociações reais. A preferência permanece nas novas sondagens da mesma sessão, até desmarcar.

A aba **13 — Gestão Comercial** aparece para administradores e supervisores aprovados. Vendedores continuam registrando e recuperando suas próprias sondagens na aba 1. Administradores consultam todas as equipes; supervisores apenas as atribuídas. A base de usuários e o login da aba 12 continuam sendo os existentes.

O cadastro novo consulta a disponibilidade do nome antes do envio. Um índice no banco impede solicitações simultâneas com o mesmo nome completo normalizado, ignorando acentos, caixa, espaços e pontuação. E-mails já são únicos no Auth. Pessoas distintas com o mesmo nome completo precisam de conferência administrativa antes de novo cadastro. Nenhuma senha foi lida, exportada ou alterada.

## Equipes

As equipes iniciais foram geradas a partir dos supervisores aprovados e dos vínculos de `perfis.supervisor_id`. Novas aprovações passam a gerar os vínculos comerciais automaticamente. O administrador pode criar equipes e gerenciar seus membros e supervisores na aba 12. A equipe histórica de cada sondagem não muda automaticamente quando o vendedor troca de equipe.

## Gravação e falhas

- Primeira gravação automática após aproximadamente 5 segundos; próximas com intervalo mínimo de 30 segundos, somente quando há alterações. Os botões explícitos podem salvar antes desse intervalo.
- UUID por sondagem e operação, uma gravação por vez, repetição idempotente e controle de versão. Conflitos não sobrescrevem silenciosamente outro usuário ou outra aba.
- Dados de cliente não são guardados no armazenamento local do navegador. A sessão guarda apenas identificação recente e preferência de teste; a autenticação segue o mecanismo Supabase já existente.
- Sem conexão, alterações ficam em memória nesta aba e há novas tentativas com intervalo crescente. Fechar a página ou confirmar saída antes de sincronizar pode perder o que ainda não foi enviado. Recuperar carrega a última versão confirmada pelo servidor.
- A lista pessoal contém até 100 registros dos últimos 90 dias. A gestão tem paginação por cursor de 50 registros.

## Indicadores e relatórios

Sondagem inclui rascunho. Proposta apresentada não é venda. Finalizada encerra a negociação sem presumir venda. Venda confirmada exige ação de gestor autorizado e referência de contrato/pedido, com registro de quem confirmou.

Conversão = vendas confirmadas ÷ propostas apresentadas no conjunto filtrado. Ticket médio usa apenas vendas confirmadas. Receita é soma das mensalidades contratadas, não recebimento financeiro.

O período e a evolução diária/semanal/mensal usam a criação da sondagem no horário de Brasília. São indicadores de coorte, não de data de pagamento ou confirmação. Filtros: vendedor, supervisor, equipe, período, produto e situação. A visão Só testes é separada; não há indicador que misture testes com negociações reais.

PDF e Excel respeitam a mesma autorização do banco. Período máximo de 366 dias e exportação de até 5.000 registros por vez. O Excel grava nomes e observações como texto literal, inclusive se começarem com `=`. Exportações paginadas não são uma fotografia transacional: alterações durante a extração podem aparecer em versões diferentes.

O desconto do registro comercial reduz o total dos novos relatórios. Ele não modifica o catálogo nem os PDFs antigos das abas 1–4; o campo informa essa diferença. Os recursos antigos foram preservados.

## Banco e segurança

Migrações aplicadas:

- `supabase/migrations/20261102170043_gestao_comercial_e_cadastros_unicos.sql`
- `supabase/migrations/20261102170858_indices_apoio_gestao_comercial.sql`

São reutilizados Supabase Auth e `public.perfis`. As novas tabelas de equipes, membros, supervisores, sondagens e auditoria têm RLS. Gravações são feitas por funções que validam usuário aprovado, responsável, equipe, conteúdo e versão. As implementações privilegiadas ficam em `itop_private`; os endpoints públicos novos são invoker. Chaves administrativas não foram colocadas no site.

A tabela privada de operações tem RLS sem políticas de acesso direto por desenho: somente as funções internas autorizadas a acessam. Os índices de confirmado_por e supervisor_id foram incluídos após a revisão de desempenho. Índices novos sem uso ainda são esperados antes do início das operações.

Funções antigas de gestão de usuários mantêm suas verificações e permissões. A listagem pública de supervisores continua necessária para o cadastro e retorna apenas nome e ID de supervisores aprovados. A proteção de senhas vazadas continua como estava no Auth; nenhum upgrade foi contratado. Orientações:

- https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Retenção e capacidade

Não foi agendada exclusão automática. A função administrativa de retenção prevê rascunhos sem atualização há 90 dias, registros encerrados há 365 dias, exclusões lógicas após 30 dias, auditoria sem conteúdo por 365 dias e operações por 2 dias. Esses são prazos operacionais propostos, não prazos jurídicos obrigatórios. Não executar limpeza sem definição do responsável da ITOP e política de backup.

O plano Free tem recursos compartilhados e limites de banco/tráfego; usuários mensais não garantem simultaneidade. A gravação a cada 30 segundos limita o volume, mas não representa garantia de capacidade. Houve 31 casos locais de banco e 23 verificações no Supabase real, com dados fictícios revertidos e zero registros de teste remanescentes. A simulação local de 50/100 requisições não é medição de vendedores reais. A tentativa de carga administrativa SQL simultânea não concluiu pela integração e não fundamenta promessa de 50/100 usuários. O roteiro `carga-homologacao.js` exige contas fictícias distintas e projeto de teste autorizado, e não foi executado contra produção.

Ainda é necessário medir o uso real de navegador, latência p95, erros, tamanho de banco e tráfego antes de ampliar a operação para 50/100 usuários. Não há atualização de dashboard em loop nem assinatura Realtime por vendedor. O limite por período e os relatórios agregados reduzem consultas e transferência de dados.

## Reversão

Os arquivos anteriores e o estado inicial de perfis/permissões foram preservados em backup. Para desativar a captura, alterar `comercial/config.js` para `enabled:false` e publicar. Não apagar tabelas como reversão: podem conter novas sondagens. Proteger/exportar os dados antes de qualquer remoção de estrutura.
