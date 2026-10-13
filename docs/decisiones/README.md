# Registro de Decisiones de Arquitectura (ADR)

Este directorio almacena las decisiones técnicas y arquitectónicas relevantes de **AntropoPopo**.

## Criterio de Selección (Cuándo Documentar)

Se documenta una decisión en este directorio **únicamente si cumple las tres condiciones**:
1. **Es difícil de revertir**: Cambiarla a futuro implica un costo o refactor significativo.
2. **Sorprende sin contexto**: Un nuevo colaborador o agente no entendería el porqué sin conocer el trasfondo histórico.
3. **Surge de elegir entre alternativas reales**: Existieron al menos dos caminos viables y se optó por uno fundamentado.

## Plantilla de Decisión (ADR Ligero)

Crear un archivo `NNNN-titulo-de-la-decision.md` con el siguiente formato:

```markdown
# [Número]: [Título de la Decisión]

- **Fecha**: YYYY-MM-DD
- **Estado**: Aceptada | Propuesta | Reemplazada

## Contexto y Problema
Descripción breve de la necesidad o restricción técnica que motivó la decisión.

## Alternativas Evaluadas
1. **Alternativa A**: Ventajas y desventajas.
2. **Alternativa B**: Ventajas y desventajas.

## Decisión Adoptada
Qué alternativa se eligió y la justificación técnica de la elección.

## Consecuencias y Trade-offs
Impacto esperado, limitaciones aceptadas y pasos a seguir.
```

