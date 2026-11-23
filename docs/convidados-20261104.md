# Convidados — financeiro e retenção

A entrada oferece Criar conta de convidado e o formulário permite escolher o perfil. A solicitação continua pendente até a aprovação administrativa. O banco resolve automaticamente a carteira de código `adm-mario`, sem depender de equipe enviada pelo navegador.

Após aprovação, o convidado usa os módulos de atendimento sem a trilha obrigatória dos vendedores. Mantém novas simulações, salvamento e PDFs; gestão de usuários e relatórios permanecem restritos aos gestores. A carteira recebe o vínculo do convidado automaticamente.

`origem_convidado` identifica permanentemente as propostas criadas por esse perfil. Um gatilho determina a origem a partir do perfil aprovado no banco e impede a remoção dessa origem ao atualizar. O filtro central dos indicadores exclui esses registros tanto da produção quanto dos testes. A consulta de registros próprios em modo `todos` continua disponível. Não houve mudança nas políticas de acesso RLS nem reclassificação de registros existentes.

Verificação: testes de navegação e regressão em Node, conferência visual do cadastro e teste transacional completo em `tests/convidados-20261104.sql`. O teste no banco comprovou cadastro pendente, aprovação, vínculo de carteira, leitura/salvamento, exclusão dos indicadores e bloqueio das funções de gestão. A transação foi revertida; não foram criadas contas permanentes nem enviados convites.

SQL aplicado: `supabase/convidados-20261104.sql`.
