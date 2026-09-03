# ADR-011 — User provisioning e identidade externa

## Contexto

Keycloak autentica a identidade, mas os recursos do RiseXPTO precisam referenciar um usuário persistido no PostgreSQL. O sistema também precisa aceitar atualização de e-mail/nome e impedir acesso de usuários desativados.

## Decisão

`User.id` continua sendo um UUID interno do RiseXPTO. O `sub` do Keycloak é persistido em `User.externalAuthId`, com constraint `UNIQUE`, e é a chave confiável para o upsert no primeiro request autenticado.

O provisioning localiza por `externalAuthId`, cria `User` e `UserProfile` quando necessário, atualiza e-mail, data de verificação e nome do perfil, devolve o UUID interno e rejeita usuários com `deletedAt` preenchido.

Roles (`USER`, `SUPPORT`, `ADMIN`) continuam sendo autoridade do token/Keycloak nesta etapa. O campo `User.role` existente é mantido para compatibilidade e não deve ser usado para elevar privilégios.

## Justificativa

Separar o UUID interno do subject externo evita acoplamento das relações de domínio ao provedor de identidade e permite migração de provedor sem reescrever foreign keys. A unicidade no subject impede duas contas RiseXPTO para a mesma identidade Keycloak.

## Consequências e riscos

- requests autenticados dependem da disponibilidade do PostgreSQL;
- sincronização de e-mail pode encontrar conflito com outro usuário e deve resultar em erro seguro;
- remoção no Keycloak não apaga automaticamente dados do RiseXPTO;
- roles precisam continuar sendo verificadas no token, com auditoria de ações administrativas.

## Estado

Implementação inicial em `apps/api/src/users`; integração E2E e teste contra PostgreSQL real ainda são obrigatórios antes do Gate A.
