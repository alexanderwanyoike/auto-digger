import { useState } from 'react';

const yearPattern = '[1-9][0-9]{3}';

export function CatalogueYearForm({
  disabled,
  onApply,
}: {
  disabled: boolean;
  onApply: (from: number, to: number | undefined) => void;
}) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [reversed, setReversed] = useState(false);
  return (
    <form
      className="catalogue-jump"
      onSubmit={(event) => {
        event.preventDefault();
        const start = Number(from);
        const end = to ? Number(to) : undefined;
        if (end !== undefined && end < start) {
          setReversed(true);
          return;
        }
        onApply(start, end);
      }}
    >
      <label className="catalogue-jump-field" htmlFor="catalogue-from-year">
        <span>From year</span>
        <input
          id="catalogue-from-year"
          type="text"
          inputMode="numeric"
          maxLength={4}
          pattern={yearPattern}
          required
          disabled={disabled}
          value={from}
          onChange={(event) => {
            setFrom(event.target.value);
            setReversed(false);
          }}
        />
      </label>
      <label className="catalogue-jump-field" htmlFor="catalogue-to-year">
        <span>To year</span>
        <input
          id="catalogue-to-year"
          type="text"
          inputMode="numeric"
          maxLength={4}
          pattern={yearPattern}
          disabled={disabled}
          aria-invalid={reversed || undefined}
          aria-describedby={reversed ? 'catalogue-year-error' : undefined}
          value={to}
          onChange={(event) => {
            setTo(event.target.value);
            setReversed(false);
          }}
        />
      </label>
      <button type="submit" className="secondary-button" disabled={disabled || from.length !== 4}>
        Go
      </button>
      {reversed && (
        <p id="catalogue-year-error" className="catalogue-year-error" role="alert">
          To year must be the same as or later than From year.
        </p>
      )}
    </form>
  );
}
