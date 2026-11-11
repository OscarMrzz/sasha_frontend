<!-- intent-skills:start -->
## Skill Loading

Before editing files for a substantial task:
- Run `pnpm dlx @tanstack/intent@latest list` from the workspace root to see available local skills.
- If a listed skill matches the task, run `pnpm dlx @tanstack/intent@latest load <package>#<skill>` before changing files.
- Use the loaded `SKILL.md` guidance while making the change.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.
<!-- intent-skills:end -->

## Consultas y temporizadores

- En vistas de horarios con actualización manual acordada, como **Exámenes → Ahora**, consulta al entrar y al pulsar el botón de actualización. No agregues polling, refresco por foco/reconexión ni cambios de `queryKey` ligados al reloj.
- El frontend calcula cronómetros y alertas con la fecha y hora recibidas. Sus intervalos locales no deben consultar el backend.
- Cada pulsación debe generar una sola consulta con la hora actual. Cualquier actualización automática adicional requiere un requisito explícito.
