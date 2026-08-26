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
    <section className="flex min-h-[70vh] items-center justify-center px-5 py-16 sm:px-8">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="font-body text-xs font-semibold uppercase tracking-[0.14em] text-pink">
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
