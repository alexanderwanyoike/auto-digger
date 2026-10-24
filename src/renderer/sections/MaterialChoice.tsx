import { useId } from 'react';
import type { Preferences } from '../../shared/preferences';

export function MaterialChoice({
  value,
  title,
  description,
  checked,
  disabled,
  busy,
  onSelect,
}: {
  value: Preferences['material'];
  title: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  busy: boolean;
  onSelect: () => void;
}) {
  const id = useId();
  return (
    <label className="material-choice" htmlFor={id}>
      <input
        id={id}
        type="radio"
        name="appearance-material"
        value={value}
        aria-label={title}
        aria-describedby={`${id}-description`}
        checked={checked}
        disabled={disabled}
        aria-disabled={disabled || busy}
        onChange={onSelect}
      />
      <span className="material-thumbnail" data-material={value} aria-hidden="true">
        <span className="material-mini-header">
          <i />
          <i />
          <i />
        </span>
        <span className="material-mini-body">
          <span className="material-mini-sidebar">
            <i />
            <i />
            <i />
          </span>
          <span className="material-mini-records">
            <i />
            <i />
            <i />
          </span>
        </span>
      </span>
      <strong>{title}</strong>
      <span id={`${id}-description`} className="material-description">
        {description}
      </span>
    </label>
  );
}
