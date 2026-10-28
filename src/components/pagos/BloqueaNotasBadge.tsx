/** Badge del flag «Bloquea notas» de un tipo de pago. */
export function BloqueaNotasBadge({ bloquea }: { bloquea: boolean }) {
  return (
    <span
      className={`badge${bloquea ? '' : ' badge--muted'}`}
      data-testid={bloquea ? 'tipo-pago-badge-bloquea' : 'tipo-pago-badge-no-bloquea'}
    >
      {bloquea ? 'Bloquea notas' : 'No bloquea notas'}
    </span>
  )
}
