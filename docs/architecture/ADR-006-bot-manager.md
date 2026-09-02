# ADR-006 — Lifecycle do Bot Manager

## Contexto

Bots precisam ter um lifecycle explícito e auditável, sem depender de requisições HTTP para executar e sem permitir que uma edição altere um bot em execução.

## Decisão

O `@risexpto/bot-manager` centraliza criação, configuração, validação, start, pause, resume, stop, archive e duplicação. Transições inválidas são rejeitadas, cada mutação gera `BotEvent`, e listeners permitem atualização em tempo real. O armazenamento é abstraído pelo manager atual e a integração persistente pode ser ligada ao Prisma/worker sem mudar o contrato.

## Consequências e riscos

O manager não executa ordens nem substitui o Risk Engine. A implementação atual é determinística e em memória para manter a camada de domínio testável; a persistência e concorrência distribuída ficam para o Worker Runtime.
