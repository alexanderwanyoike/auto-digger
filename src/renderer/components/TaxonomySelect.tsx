import { useId } from 'react';
import CreatableSelect from 'react-select/creatable';

export function TaxonomySelect({
  name,
  label,
  options,
  disabled,
  value,
  onChange,
  knownOptions = options,
  placeholder = name === 'genre' ? 'All genres' : 'All styles',
}: {
  name: string;
  label: string;
  options: readonly string[];
  disabled: boolean;
  value: readonly string[];
  onChange: (values: string[]) => void;
  knownOptions?: readonly string[];
  placeholder?: string;
}) {
  const id = useId();
  return (
    <div className="taxonomy-field">
      <label htmlFor={id}>{label}</label>
      <CreatableSelect<{ value: string; label: string }, true>
        inputId={id}
        instanceId={id}
        name={name}
        value={value.map((item) => ({ value: item, label: item }))}
        onChange={(selected) => {
          onChange(selected.map((item) => item.value));
        }}
        isMulti
        isClearable
        isDisabled={disabled}
        options={options.map((item) => ({ value: item, label: item }))}
        placeholder={placeholder}
        classNamePrefix="taxonomy"
        unstyled
        closeMenuOnSelect={false}
        blurInputOnSelect={false}
        menuPortalTarget={document.body}
        menuPosition="fixed"
        maxMenuHeight={200}
        menuShouldScrollIntoView={false}
        formatCreateLabel={(input) => `Use "${input}"`}
        isValidNewOption={(input, _selected, available) =>
          Boolean(input.trim()) &&
          input.trim().length <= 160 &&
          !input.includes('|') &&
          !knownOptions.some((option) => option.toLowerCase() === input.trim().toLowerCase()) &&
          !available.some((option) => option.label?.toLowerCase() === input.trim().toLowerCase())
        }
      />
    </div>
  );
}
