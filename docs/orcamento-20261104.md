# Orçamento independente e clientes existentes

Estado: implementação em revisão, sem ativação em produção. As 13 capas foram enviadas separadamente no commit a54cb7e.

Arquivos: index.html, ajustes-trilha-20261103.js, fluxo-vendedor.js, comercial/bridge.js, comercial/comercial.js, comercial/proposta-pdf.js; novos comercial/orcamento-core.js, comercial/orcamento.js e comercial/orcamento.css.

- Cliente ITOP usa registro manual do pacote atual, comparação e escolha manual, sem executar a indicação inteligente.
- U.V.I. mantém materiais e passa a ter TODOS primeiro, 16 — Orçamento e 17 — Financeiro.
- Orçamento reaproveita o catálogo e os cálculos originais. Salvar, PDF, compartilhar e agendar registram a mesma proposta em espera. Conversão recupera o mesmo ID e exige complemento de dados e checklist.
- Financeiro contém estrutura para seis tipos de material, sem operações financeiras reais.
- Comparação e PDF incluem serviços atuais adicionais, valores e diferença mensal. Relatórios usam filtros e RLS existentes, excluindo testes e convidados dos resultados reais.

## Validação concluída

`node --test tests/*.test.cjs`: 26 testes aprovados; os arquivos existentes incluem ainda 8 verificações do operador e 10 cenários de impacto no pacote. Sintaxe dos scripts externos alterados e de todos os scripts inline verificada.

Navegador, com dados fictícios e persistência simulada apenas na prévia local: acesso direto à calculadora, seleção de plano, salvamento simulado em espera, edição de pacote atual (R$150 para R$99,90: redução de R$50,10) e conversão para fechamento mantendo cliente e plano. Registro visual em docs/verificacoes/orcamento-local.jpg.

## Etapa bloqueada

A revisão automática rejeitou a aplicação da migração de produção `orcamento_independente_clientes_itop`, por substituir funções centrais SECURITY DEFINER e definir execução das novas funções. Nenhuma alteração desta migração foi aplicada. A rejeição exige aprovação específica antes de nova tentativa. O SQL revisável está em supabase/orcamento-20261104.sql.

A migração amplia a lista de campos comerciais permitidos, cria salvamento atômico de orçamento e indicadores sob as permissões atuais, e exige checklist ao converter orçamento em venda. Não exclui dados, não modifica perfis administrativos e não altera políticas RLS.

Após autorização: aplicar a migração; executar tests/orcamento-20261104.sql (transacional, com ROLLBACK) e as regressões SQL; conferir os avisos de segurança e testar autenticação/persistência reais antes de integrar a revisão. A persistência no Supabase, o agendamento real, os relatórios novos e a interface móvel ainda não foram homologados ponta a ponta. Não publicar a interface funcional enquanto faltarem essas validações.
