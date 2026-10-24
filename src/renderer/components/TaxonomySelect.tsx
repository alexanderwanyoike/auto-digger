import { useId } from 'react';
import CreatableSelect from 'react-select/creatable';

export function TaxonomySelect({
  name,
  label,
  options,
  disabled,
}: {
  name: string;
  label: string;
  options: readonly string[];
  disabled: boolean;
}) {
  const id = useId();
  return (
    <div className="taxonomy-field">
      <label htmlFor={id}>{label}</label>
      <CreatableSelect
        inputId={id}
        instanceId={id}
        name={name}
        isMulti
        isClearable
        isDisabled={disabled}
        options={options.map((value) => ({ value, label: value }))}
        placeholder={`All ${name === 'genre' ? 'genres' : 'styles'}`}
        classNamePrefix="taxonomy"
        unstyled
        closeMenuOnSelect={false}
        blurInputOnSelect={false}
        menuPortalTarget={document.body}
        menuPosition="fixed"
        maxMenuHeight={200}
        menuShouldScrollIntoView={false}
        formatCreateLabel={(value) => `Use "${value}"`}
        isValidNewOption={(input, _selected, available) =>
          Boolean(input.trim()) &&
          input.trim().length <= 160 &&
          !input.includes('|') &&
          !available.some((option) => option.label?.toLowerCase() === input.trim().toLowerCase())
        }
      />
    </div>
  );
}
