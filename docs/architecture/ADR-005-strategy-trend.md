# ADR-005 — Trend Following como estratégia determinística

## Contexto

A primeira estratégia de tendência precisa reutilizar candles do Market Data Engine, permanecer independente de exchange e ser adequada tanto ao PAPER quanto ao futuro backtest.

## Decisão

Implementar `@risexpto/strategy-trend` com EMA rápida/lenta, momentum, volume relativo e ATR como filtro de volatilidade. A estratégia produz `TradeProposal` sem conhecer Risk Engine, Execution ou credenciais. Nesta fase, somente PAPER emite propostas.

## Justificativa

Os indicadores são explicáveis, baratos e determinísticos. O filtro de volatilidade e a validação de dados evitam sinais em condições inadequadas, enquanto parâmetros versionados permitem reprodução em backtests.

## Consequências e riscos

O método não promete rentabilidade e pode perder movimentos ou operar em mercados laterais. O Risk Engine continua sendo obrigatório antes de qualquer execução; não há otimização automática nem dependência de IA.
