import { Monitor, Moon, Sun } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import type { Preferences } from '../../shared/preferences';
import type { Appearance } from '../theme/preferences';
import type { usePreferences } from './usePreferences';
import { MaterialChoice } from './MaterialChoice';

const materials = [
  {
    value: 'aluminium',
    title: 'Brushed aluminium',
    description: 'Satin metal with a fine, bead-blasted grain.',
  },
  {
    value: 'ceramic',
    title: 'Ceramic',
    description: 'Soft neutral surfaces with a little warmth.',
  },
  { value: 'slate', title: 'Slate', description: 'Muted blue-grey with a quieter finish.' },
  { value: 'graphite', title: 'Graphite', description: 'Soft greys with a matte finish.' },
  { value: 'paper', title: 'Warm paper', description: 'Cream tones and a soft paper grain.' },
  { value: 'copper', title: 'Copper', description: 'Warm metal with a brushed finish.' },
  { value: 'carbon', title: 'Carbon', description: 'Black framing and soft charcoal panels.' },
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
  { value: 'coral', label: 'Coral' },
  { value: 'sage', label: 'Sage' },
  { value: 'lilac', label: 'Lilac' },
  { value: 'rose', label: 'Rose' },
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
  const id = useId();
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
                value={material.value}
                title={material.title}
                description={material.description}
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
                <label key={value} className="mode-choice" htmlFor={`${id}-mode-${value}`}>
                  <input
                    id={`${id}-mode-${value}`}
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
                <label
                  key={value}
                  className="accent-choice"
                  title={label}
                  htmlFor={`${id}-accent-${value}`}
                >
                  <input
                    id={`${id}-accent-${value}`}
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
                  <span className="accent-swatch" data-accent={value} aria-hidden="true" />
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
