import { Monitor, Moon, Sun } from 'lucide-react';
import type { Appearance } from '../theme/preferences';

interface AppearanceControlProps {
  appearance: Appearance;
  onSelect: (appearance: Appearance) => void;
}

const choices = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Monitor },
] as const;

export function AppearanceControl({ appearance, onSelect }: AppearanceControlProps) {
  return (
    <div className="appearance-control" role="group" aria-label="Appearance">
      {choices.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          aria-label={label}
          title={`${label} appearance`}
          aria-pressed={appearance === value}
          onClick={() => {
            onSelect(value);
          }}
        >
          <Icon size={13} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
