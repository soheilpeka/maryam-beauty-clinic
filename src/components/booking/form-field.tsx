"use client";

export function FormField({
  id,
  label,
  type = "text",
  value,
  onChange,
  error,
  autoComplete,
  required,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
        {required && <span aria-hidden="true" className="text-brand"> *</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        required={required}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-none"
      />
      {error && (
        <p id={`${id}-error`} className="mt-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
