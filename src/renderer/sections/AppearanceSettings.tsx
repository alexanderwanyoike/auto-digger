import { Monitor, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Preferences } from '../../shared/preferences';
import type { Appearance } from '../theme/preferences';
import type { usePreferences } from './usePreferences';
import { MaterialChoice } from './MaterialChoice';

const materials = [
  {
    value: 'aluminium',
    title: 'Brushed aluminium',
    description: 'Cool metal with a fine horizontal grain.',
  },
  {
    value: 'ceramic',
    title: 'Ceramic',
    description: 'Soft neutral surfaces with a little warmth.',
  },
  { value: 'slate', title: 'Slate', description: 'Muted blue-grey with a quieter finish.' },
] as const;
const modes = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Monitor },
] as const;
const accents = [
  { value: 'blue', label: 'Blue' },
  { value: 'teal', label: 'Teal' },
  { value: 'amber', label: 'Amber' },
] as const;

export function AppearanceSettings({
  preferences,
  appearance,
  onAppearance,
}: {
  preferences: ReturnType<typeof usePreferences>;
  appearance: Appearance;
  onAppearance: (value: Appearance) => void;
}) {
  const disabled = !preferences.available;
  const [selection, setSelection] = useState({
    material: preferences.value.material,
    accent: preferences.value.accent,
  });
  useEffect(() => {
    setSelection({ material: preferences.value.material, accent: preferences.value.accent });
  }, [preferences.value.material, preferences.value.accent]);
  async function select(patch: Partial<Pick<Preferences, 'material' | 'accent'>>) {
    if (disabled || preferences.busy) return;
    const previous = selection;
    setSelection({ ...previous, ...patch });
    try {
      const result = await preferences.save(patch);
      if (!result.ok) setSelection(previous);
    } catch {
      setSelection(previous);
    }
  }
  return (
    <section className="appearance-settings" aria-label="Appearance settings">
      <header>
        <h2>Appearance</h2>
        <p>Choose a material, appearance and accent colour.</p>
      </header>
      <div className="appearance-options">
        <fieldset className="material-options" aria-busy={preferences.busy}>
          <legend>Material</legend>
          <div className="material-choices">
            {materials.map((material) => (
              <MaterialChoice
                key={material.value}
                {...material}
                checked={selection.material === material.value}
                disabled={disabled}
                busy={preferences.busy}
                onSelect={() => {
                  select({ material: material.value }).catch(() => undefined);
                }}
              />
            ))}
          </div>
        </fieldset>
        <div className="appearance-details">
          <fieldset>
            <legend>Appearance mode</legend>
            <div className="mode-options">
              {modes.map(({ value, label, Icon }) => (
                <label key={value} className="mode-choice">
                  <input
                    type="radio"
                    name="appearance-mode"
                    value={value}
                    aria-label={label}
                    checked={appearance === value}
                    onChange={() => {
                      onAppearance(value);
                    }}
                  />
                  <span>
                    <Icon size={14} aria-hidden="true" />
                    {label}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset aria-busy={preferences.busy}>
            <legend>Accent colour</legend>
            <div className="accent-options">
              {accents.map(({ value, label }) => (
                <label key={value} className="accent-choice" title={label}>
                  <input
                    type="radio"
                    name="appearance-accent"
                    value={value}
                    aria-label={label}
                    checked={selection.accent === value}
                    disabled={disabled}
                    aria-disabled={disabled || preferences.busy}
                    onChange={() => {
                      select({ accent: value }).catch(() => undefined);
                    }}
                  />
                  <span className={`accent-swatch accent-${value}`} aria-hidden="true" />
                </label>
              ))}
              <span className="accent-name">
                {accents.find((accent) => accent.value === selection.accent)?.label}
              </span>
            </div>
          </fieldset>
        </div>
      </div>
    </section>
  );
}
