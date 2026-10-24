import { useId } from 'react';

export function SettingsSelect<T extends string>({
  label,
  value,
  options,
  disabled,
  onSelect,
}: {
  label: string;
  value: T;
  options: readonly T[];
  disabled: boolean;
  onSelect: (value: T) => void;
}) {
  const id = useId();
  return (
    <label className="settings-select" htmlFor={id}>
      {label}
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => {
          const selected = options.find((option) => option === event.target.value);
          if (selected) onSelect(selected);
        }}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option === 'release'
              ? 'Folder per release'
              : option.charAt(0).toUpperCase() + option.slice(1)}
          </option>
        ))}
      </select>
    </label>
  );
}
