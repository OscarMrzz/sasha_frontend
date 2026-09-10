type WizardStep = {
  id: string
  label: string
}

type WizardStepsProps = {
  steps: WizardStep[]
  current: number
}

/** Rail industrial: círculos numerados + conector; marca done / current / upcoming. */
export function WizardSteps({ steps, current }: WizardStepsProps) {
  return (
    <nav className="wizard-steps" aria-label="Pasos del formulario">
      <ol className="wizard-steps__list">
        {steps.map((step, i) => {
          const state = i < current ? 'done' : i === current ? 'current' : 'upcoming'
          return (
            <li key={step.id} className={`wizard-steps__item wizard-steps__item--${state}`}>
              {i > 0 ? <span className="wizard-steps__connector" aria-hidden /> : null}
              <span className="wizard-steps__node">
                <span className="wizard-steps__circle" aria-current={state === 'current' ? 'step' : undefined}>
                  {state === 'done' ? (
                    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
                      <path
                        d="M2.5 7.2 5.4 10l6.1-6.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </span>
                <span className="wizard-steps__label">{step.label}</span>
              </span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
