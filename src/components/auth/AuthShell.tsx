export function AuthShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="relative flex min-h-[70vh] items-center justify-center overflow-hidden px-5 py-16 sm:px-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gradient-buddy opacity-[0.12] blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-gradient-buddy opacity-[0.1] blur-3xl"
      />

      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="font-body text-xs font-semibold uppercase tracking-[0.14em] text-pink-on-tint">
            {eyebrow}
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-ink">{title}</h1>
          {description && <p className="mt-2 text-sm text-ink/60">{description}</p>}
        </div>
        <div className="rounded-lg border border-border bg-white p-7 shadow-md sm:p-8">
          {children}
        </div>
      </div>
    </section>
  );
}
