import { ArrowDown, ArrowUp, X } from 'lucide-react';
import { folderFieldSchema } from '../../shared/preferences';
import type { FolderField } from '../../shared/preferences';

const examples: Record<FolderField, string> = {
  source: 'YouTube',
  genre: 'Electronic',
  year: '1998',
  label: 'Still Records',
  artist: 'Low Tide',
  release: 'Low Tide - Quiet Orbit EP [r12]',
};
export function DownloadFolders({
  fields,
  root,
  disabled,
  onChange,
}: {
  fields: FolderField[];
  root: string;
  disabled: boolean;
  onChange: (fields: FolderField[]) => void;
}) {
  function move(index: number, offset: number) {
    const reordered = [...fields];
    const value = reordered[index];
    const other = reordered[index + offset];
    if (!value || !other) return;
    reordered[index] = other;
    reordered[index + offset] = value;
    onChange(reordered);
  }
  return (
    <div className="download-folders">
      <ol aria-label="Folder levels">
        {fields.map((field, index) => (
          <li key={field}>
            <span>{field.charAt(0).toUpperCase() + field.slice(1)}</span>
            <button
              type="button"
              className="icon-button"
              aria-label={`Move ${field} up`}
              disabled={disabled || index === 0}
              onClick={() => {
                move(index, -1);
              }}
            >
              <ArrowUp size={13} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="icon-button"
              aria-label={`Move ${field} down`}
              disabled={disabled || index === fields.length - 1}
              onClick={() => {
                move(index, 1);
              }}
            >
              <ArrowDown size={13} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="icon-button"
              aria-label={`Remove ${field} folder`}
              disabled={disabled}
              onClick={() => {
                onChange(fields.filter((item) => item !== field));
              }}
            >
              <X size={13} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ol>
      <label className="settings-select" htmlFor="add-download-folder">
        Add folder level
        <select
          id="add-download-folder"
          value=""
          disabled={disabled || fields.length === folderFieldSchema.options.length}
          onChange={(event) => {
            const parsed = folderFieldSchema.safeParse(event.target.value);
            if (parsed.success && !fields.includes(parsed.data)) onChange([...fields, parsed.data]);
          }}
        >
          <option value="">Choose a level</option>
          {folderFieldSchema.options
            .filter((field) => !fields.includes(field))
            .map((field) => (
              <option key={field} value={field}>
                {field.charAt(0).toUpperCase() + field.slice(1)}
              </option>
            ))}
        </select>
      </label>
      <p>
        Folders nest from top to bottom. Genre and label use the first Discogs value. Missing
        metadata uses an Unknown folder.
      </p>
      <output className="download-folder-preview" aria-label="Folder preview">
        {[root, ...fields.map((field) => examples[field])].join(' / ')} / track.mp3
      </output>
    </div>
  );
}
