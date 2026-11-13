import { useState } from 'react';

export function YearComparisonForm({
  disabled,
  compare,
}: {
  disabled: boolean;
  compare: (first: string, second: string) => void;
}) {
  const [first, setFirst] = useState('');
  const [second, setSecond] = useState('');
  return (
    <form
      className="explore-year-form"
      onSubmit={(event) => {
        event.preventDefault();
        compare(first, second);
      }}
    >
      <label htmlFor="explore-first-year">
        First year
        <input
          id="explore-first-year"
          value={first}
          onChange={(event) => {
            setFirst(event.target.value);
          }}
          inputMode="numeric"
          pattern="[0-9]{4}"
          maxLength={4}
          required
          disabled={disabled}
        />
      </label>
      <label htmlFor="explore-second-year">
        Second year
        <input
          id="explore-second-year"
          value={second}
          onChange={(event) => {
            setSecond(event.target.value);
          }}
          inputMode="numeric"
          pattern="[0-9]{4}"
          maxLength={4}
          required
          disabled={disabled}
        />
      </label>
      <button type="submit" className="secondary-button" disabled={disabled || first === second}>
        Compare years
      </button>
    </form>
  );
}
