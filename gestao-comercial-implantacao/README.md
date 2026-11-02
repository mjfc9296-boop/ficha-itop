# ITOP — Gestão Comercial e capas de vídeos

**Situação: publicação dos arquivos autorizada pelo proprietário. Gestão Comercial permanece desativada até configuração e homologação do Supabase; capas prontas para uso.**
Base: `mjfc9296-boop/ficha-itop`, commit `31cd46e2d84312955a4d75a18763ffdce19503ff`.

## O que está preparado

- 13ª aba Gestão Comercial, com identidade preta/laranja `#d27a2f`, responsiva e reservada à gestão.
- Registro comercial na Sondagem: rascunho automático, proposta apresentada, finalização, resultado, desconto registrado, identificação UUID e recuperação da versão salva.
- Vendedores: seus próprios registros. Supervisores: equipes explicitamente atribuídas. Administradores: visão geral e gestão de vínculos integrada à aba 12. A tabela `perfis` e o Supabase Auth existentes são reutilizados.
- Indicadores agregados no banco, filtros por vendedor/supervisor/equipe/período/produto/situação, rankings e evolução diária/semanal/mensal.
- PDF e Excel dos registros autorizados; até 5.000 registros por exportação, com orientação para reduzir filtros acima disso. O Excel grava textos literais, sem interpretar nomes de clientes como fórmulas.
- Quatro capas geradas para Globoplay, Disney+, HBO e Deezer, usadas no atributo `poster` dos oito players existentes (UVI e rodapé comum). Os vídeos continuam com seus controles.

## Arquivos e como revisar

- `PREVIA_GESTAO_E_CAPAS.html`: demonstração independente, com dados fictícios. Abra no navegador. Não consulta nem grava no Supabase e não modifica o GitHub. Os filtros dessa prévia não consultam dados reais; mostram a interface de revisão.
- `staging/index.html`, `staging/comercial/` e `staging/capas-videos/`: arquivos alterados/novos para aplicação sobre a cópia do repositório base. O ZIP de revisão é uma atualização, não um repositório completo. Os demais arquivos são mantidos.
- `sql/000_preflight_somente_leitura.sql`: consultas para inspeção do banco real.
- `sql/001_gestao_comercial.sql`: migração transacional inicial; executar **somente depois do preflight e da autorização**. Não a executar novamente sobre objetos já existentes.
- `tests/`: testes e seus resultados, além de roteiro de carga em homologação.
- A cópia integral anterior está em `FICHA_ITOP_ANTES_GESTAO_31cd46e.zip`, entregue separadamente. O hash do índice consta em `backup/REVISAO.json`.

## Arquitetura e segurança

A hospedagem continua no GitHub Pages. O navegador chama o mesmo cliente Supabase autenticado do login atual; não cria outra base de usuários. As novas tabelas guardam sondagens, equipes, membros, supervisores e auditoria. Chaves administrativas e senhas não foram adicionadas.

As políticas RLS protegem consultas diretas. O navegador não recebe permissão de escrita nas tabelas; as gravações passam por funções com validação do usuário ativo/aprovado, equipe, conteúdo, valores e versão. Atribuições de equipe só podem ser feitas por administradores. Não são usadas declarações de perfil vindas de `user_metadata` para autorizar acesso.

Cada sondagem mantém o vendedor e a equipe de origem, definidos pelo servidor. A mudança futura de equipe do vendedor não transfere automaticamente o histórico. Um vendedor pode continuar vendo seu histórico; o supervisor acessa os registros pertencentes às equipes que lhe foram autorizadas. Dados de vendedor sem equipe não ficam visíveis a supervisores até uma decisão de atribuição histórica aprovada.

A aprovação e o bloqueio de contas continuam nas rotinas atuais da aba 12. **Pré-requisito bloqueante:** conferir no banco real que vendedores não podem alterar o próprio papel, aprovação ou estado ativo. Os testes locais usam uma base de perfis de teste protegida; não atestam as políticas atuais da produção.

## Salvamento, conflitos e falhas

- Primeira gravação após aproximadamente 5 segundos de alteração, somente quando houver dados relevantes.
- Gravações automáticas seguintes: intervalo mínimo de 30 segundos, mesmo durante digitação contínua. Botões explícitos podem salvar antes desse intervalo.
- Uma gravação por vez, UUID estável e identificador de operação repetido nas tentativas após falhas de rede. O banco usa controle de versão e bloqueio por sondagem.
- Em conflito com outra aba/usuário, a sincronização para e solicita reabertura; não há sobrescrita silenciosa.
- Durante falta de conexão, alterações ficam em memória nesta aba. Há aviso ao tentar sair e novas tentativas com intervalo crescente. **Fechar o navegador antes da sincronização pode perder as alterações ainda não enviadas.** A recuperação carrega a última versão confirmada pelo servidor.
- Não se guarda o conteúdo dos clientes em `localStorage` ou `sessionStorage`. A sessão guarda apenas a identificação da proposta recente; tokens seguem o mecanismo já existente do Supabase Auth.
- A lista pessoal mostra até 100 registros dos últimos 90 dias. A gestão tem paginação por cursor em lotes de 50. Recuperação mais antiga pela gestão depende do perfil autorizado.

## O que cada indicador significa

Sondagem é qualquer registro, incluindo rascunho. Proposta apresentada exige cliente e produtos, e marca a primeira apresentação. Finalizada é uma proposta encerrada, sem inferir venda. Venda confirmada exige ação de administrador ou supervisor autorizado, referência de contrato/pedido e grava quem confirmou.

Conversão = quantidade de vendas confirmadas / quantidade de propostas apresentadas no conjunto filtrado. Ticket médio = média dos totais mensais das vendas confirmadas. Receita = soma das mensalidades contratadas, e não faturamento recebido. Período e evolução usam a data de criação da sondagem no horário de Brasília: são indicadores de coorte, não a data de pagamento ou de confirmação.

Produtos oferecidos vêm da indicação apresentada; planos escolhidos vêm da composição selecionada. Quantidades e valores são armazenados na versão salva. O desconto informado reduz o total registrado nos novos relatórios. **Não altera o catálogo nem a geração dos PDFs antigos das abas 1–4**; a interface explicita essa diferença. Unificar o desconto nesses documentos deve ser decidido e validado antes de usar o campo em uma operação que dependa desses PDFs como proposta final.

A lista e os relatórios respeitam a mesma RLS. A exportação é paginada e não constitui uma fotografia transacional: alterações durante a extração podem aparecer em versões diferentes. Para fechamento contábil, será necessário um mecanismo de relatório congelado.

## Retenção proposta — depende de aprovação

A migração inclui uma função administrativa, **não agendada**, que pode remover rascunhos sem atualização há 90 dias, registros encerrados há 365 dias e exclusões lógicas após 30 dias. Auditoria sem conteúdo de cliente: 365 dias. Identificadores operacionais de repetição: 2 dias. Propostas ainda em andamento não são apagadas por essa regra; devem ser monitoradas e encerradas ou excluídas pela gestão.

Esses prazos são uma proposta operacional, não uma definição jurídica de prazo obrigatório. O responsável da ITOP deve aprová-los, inclusive exceções e a relação com contratos, antes de agendar qualquer limpeza. Backups do banco e sua exclusão devem ter prazo próprio. Nenhuma limpeza foi executada. Não inclua CPF, dados de saúde ou informações desnecessárias nas observações.

## Plano gratuito e desempenho

Fontes verificadas em 02/11/2026:
- https://supabase.com/pricing
- https://supabase.com/docs/guides/platform/billing-on-supabase
- https://supabase.com/docs/guides/database/postgres/row-level-security

O Free informa 500 MB de banco, CPU compartilhada com 500 MB de RAM, 5 GB de saída não cacheada, 5 GB de saída cacheada, 1 GB de arquivos e 50.000 usuários ativos mensais. Projetos gratuitos podem pausar após uma semana sem atividade. A franquia de usuários mensais **não é garantia de usuários simultâneos**. O Free não inclui backup automático de banco como o Pro.

Vídeos e capas continuam como arquivos do site; não são transferidos para Supabase Storage. Não foi contratado serviço pago.

Com todos os usuários alterando continuamente, 50 vendedores podem gerar aproximadamente 1,67 gravação/s; 100, cerca de 3,33 gravações/s, sem contar ações manuais e relatórios. Em 8 horas, 100 vendedores poderiam gerar até 96.000 atualizações: auditoria registra a criação e mudanças relevantes de situação/desconto, mas a tabela de idempotência também ocupa espaço. A limpeza operacional e o monitoramento precisam ser habilitados e aprovados antes do uso sustentado.

O número de sondagens suportado depende do tamanho médio real, índices, versões antigas do PostgreSQL, auditoria e operações. Monitorar tamanho do banco, tráfego, latência p95, erros e uso de disco. Propor revisão ao atingir 60% e agir antes de 80% da franquia; não prometer capacidade ilimitada.

Não há assinatura Realtime por vendedor nem atualização de dashboard em loop. Indicadores agregam no servidor; relatórios exigem filtros e limitam o período a 366 dias, e consultas de produtos sobre JSON ainda precisam de medição com volume real. Uma tabela de itens normalizados ou agregações incrementais poderá ser necessária na expansão.

## O que depende da sua autorização e conexão

1. Instalar/conectar a integração Supabase e selecionar o projeto correto; não enviar senha nem chave secreta por mensagem.
2. Autorizar inspeção somente leitura de esquema, políticas, funções, métricas e uso atual.
3. Definir projeto gratuito de homologação disponível. O limite de dois projetos pode impedir criar outro; não usar branching pago sem aprovação.
4. Aprovar a migração em homologação e definir contas fictícias, equipes e supervisores.
5. Validar políticas existentes de `perfis` e URLs de login/recuperação; não alterar a autenticação atual sem revisão.
6. Executar testes de múltiplas contas, carga real 50/100 e testes visuais/PDF/celular na homologação.
7. Aprovar retenção, rotina de limpeza, backup do banco, atribuição inicial das equipes e significado comercial do desconto.
8. Somente após os testes e **aprovação expressa**, aplicar a migração em produção, ativar `enabled:true` em `comercial/config.js` e publicar os arquivos. Hoje o valor é `false`.

## Reversão

Manter o commit-base e o ZIP de backup. Se houver problema, desativar a integração e restaurar os arquivos do site anterior mediante autorização. Não apagar tabelas de sondagens como forma de reversão: isso destruiria registros novos. Exportar/proteger os dados antes de qualquer decisão de remoção. Nada foi alterado nas políticas antigas ou nos usuários reais.
