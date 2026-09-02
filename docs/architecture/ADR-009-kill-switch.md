# ADR-009 — Kill Switch hierárquico

O Kill Switch mantém bloqueios SYSTEM, USER e BOT em memória e fail-closed para o executor. Cada ativação possui motivo, ator, timestamp e evento para auditoria. A persistência e propagação distribuída serão ligadas ao Redis/DB nas fases de runtime e observabilidade.
