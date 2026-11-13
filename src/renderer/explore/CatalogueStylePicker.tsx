import { useId } from 'react';
import Select from 'react-select';

interface StyleOption {
  value: string;
  label: string;
}

export function CatalogueStylePicker({
  style,
  styles,
  onChange,
}: {
  style: string;
  styles: string[];
  onChange: (style: string) => void;
}) {
  const id = useId();
  return (
    <div className="taxonomy-field catalogue-style">
      <span id={id}>Style</span>
      <Select<StyleOption>
        aria-labelledby={id}
        instanceId={id}
        value={{ value: style, label: style }}
        options={styles.map((value) => ({ value, label: value }))}
        onChange={(option) => {
          if (option) onChange(option.value);
        }}
        classNamePrefix="taxonomy"
        unstyled
        menuPortalTarget={document.body}
        menuPosition="fixed"
      />
    </div>
  );
}
