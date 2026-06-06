import type { ReactNode } from 'react';

export interface FieldProps {
  /** `id` of the control this field labels. */
  htmlFor: string;
  /** Visible label text. */
  label: string;
  /** The form control (input/select) to render under the label. */
  children: ReactNode;
}

/** A labelled form control: a `<label>` stacked above its input. */
export function Field({ htmlFor, label, children }: FieldProps) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-xs font-medium text-fg-muted">
        {label}
      </label>
      {children}
    </div>
  );
}
