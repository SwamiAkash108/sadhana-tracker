export default function CommitmentModal({ userName, onAccept, accepting = false }) {
  const firstName = userName?.trim().split(/\s+/)[0] || 'Friend';

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50"
      role="presentation"
    >
      <div
        className="bg-surface border-4 border-primary w-full max-w-md max-h-[min(90vh,40rem)] overflow-y-auto shadow-none relative"
        role="dialog"
        aria-modal="true"
        aria-labelledby="commitment-title"
      >
        <div className="absolute inset-0 halftone-bg opacity-10 pointer-events-none" />

        <div className="relative p-6 sm:p-8">
          <div className="text-center mb-6">
            <span
              className="material-symbols-outlined text-4xl text-secondary mb-3 inline-block"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              volunteer_activism
            </span>
            <p className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant mb-2">
              Welcome to the Sangha
            </p>
            <h2 id="commitment-title" className="font-headline-md text-headline-md text-primary">
              {firstName}, welcome home.
            </h2>
          </div>

          <p className="font-body-md text-body-md text-on-background mb-6 leading-relaxed">
            Sadhana is a quiet companion for your daily practice — a place to reflect honestly,
            grow steadily, and walk the path alongside others who care.
          </p>

          <div className="border-4 border-primary bg-surface-bright p-5 mb-6 relative">
            <div className="absolute inset-0 halftone-bg opacity-5 mix-blend-multiply pointer-events-none" />
            <h3 className="font-headline-sm text-headline-sm text-primary mb-4 relative">
              A Simple Oath
            </h3>
            <ul className="space-y-4 relative">
              <li className="flex gap-3 font-body-md text-body-md text-on-background">
                <span className="material-symbols-outlined text-secondary shrink-0 text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_circle
                </span>
                <span>
                  I will log my practice <strong>truthfully and honestly</strong> — without inflating
                  what I did or hiding what I skipped.
                </span>
              </li>
              <li className="flex gap-3 font-body-md text-body-md text-on-background">
                <span className="material-symbols-outlined text-secondary shrink-0 text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_circle
                </span>
                <span>
                  I will use this app to <strong>encourage myself and others</strong>, never to
                  screenshot, expose, or shame anyone for their practice.
                </span>
              </li>
              <li className="flex gap-3 font-body-md text-body-md text-on-background">
                <span className="material-symbols-outlined text-secondary shrink-0 text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_circle
                </span>
                <span>
                  I remember that real sadhana is between me, the divine and Guruji — this tracker is only
                  a faithful mirror.
                </span>
              </li>
            </ul>
          </div>

          <p className="font-label-sm text-label-sm text-on-surface-variant text-center mb-6 italic">
            By entering, you accept this commitment to yourself and your sangha.
          </p>

          <button
            type="button"
            onClick={onAccept}
            disabled={accepting}
            className="w-full bg-primary text-on-primary py-4 font-label-sm text-label-sm uppercase tracking-wider hover:bg-secondary transition-colors disabled:opacity-60 border-2 border-primary"
          >
            {accepting ? 'Entering…' : 'I accept — let me begin'}
          </button>
        </div>
      </div>
    </div>
  );
}
