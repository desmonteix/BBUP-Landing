export function TextField({
  label,
  name,
  type = "text",
  autoComplete,
  required,
  hint,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  hint?: string;
  defaultValue?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-semibold text-ink/80">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        defaultValue={defaultValue}
        className="w-full rounded-sm border border-border bg-white px-4 py-2.5 text-sm text-ink outline-none transition-colors duration-200 placeholder:text-ink/35 focus-visible:border-pink focus-visible:shadow-glow"
      />
      {/* text-ink/70, not /45: the hint is where a password rule is stated
          before anyone submits, and /45 measures 2.83:1 against the card. */}
      {hint && <p className="mt-1 text-xs text-ink/70">{hint}</p>}
    </div>
  );
}
