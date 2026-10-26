import { useEffect, useState } from 'react';
import { folderFields, renderFolderTemplate } from '../../shared/folder-template';
import type { FolderField } from '../../shared/folder-template';
import type { PreferencesResult } from '../../shared/preferences';

const examples: Record<FolderField, string> = {
  source: 'YouTube',
  genre: 'Electronic',
  year: '1998',
  label: 'Still Records',
  artist: 'Low Tide',
  release: 'Quiet Orbit EP [r12]',
};
export function DownloadFolders({
  template,
  root,
  disabled,
  onSave,
}: {
  template: string;
  root: string;
  disabled: boolean;
  onSave: (template: string) => Promise<PreferencesResult>;
}) {
  const [draft, setDraft] = useState(template);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    setDraft(template);
  }, [template]);
  const preview = renderFolderTemplate(draft, examples);
  async function save() {
    setSaved(false);
    if (!preview.ok) {
      setError(preview.error.message);
      return;
    }
    const result = await onSave(draft);
    if (result.ok) {
      setError(null);
      setSaved(true);
    } else setError(result.error.message);
  }
  return (
    <form
      className="download-folders"
      onSubmit={(event) => {
        event.preventDefault();
        save().catch(() => {
          setError('The folder layout could not be saved. Please retry.');
        });
      }}
    >
      <label htmlFor="download-folder-layout">
        Folder layout
        <input
          id="download-folder-layout"
          value={draft}
          disabled={disabled}
          spellCheck={false}
          autoComplete="off"
          maxLength={1024}
          placeholder="<source>/<artist>/<release>"
          aria-describedby="download-folder-help"
          aria-invalid={Boolean(error)}
          onChange={(event) => {
            setDraft(event.target.value);
            setError(null);
            setSaved(false);
          }}
        />
      </label>
      <p id="download-folder-help">Use / between folders. Leave empty to keep files together.</p>
      <div className="folder-placeholders" aria-label="Available folder placeholders">
        <span>Placeholders</span>
        {folderFields.map((field) => (
          <code key={field}>
            {'<'}
            {field}
            {'>'}
          </code>
        ))}
      </div>
      <div className="download-folder-example">
        <span>Example path</span>
        <output className="download-folder-preview" aria-label="Folder preview">
          {preview.ok
            ? [root, ...preview.value, 'track.mp3'].join(' / ')
            : 'Complete the layout to preview it.'}
        </output>
      </div>
      {error && <p role="alert">{error}</p>}
      <div className="download-folder-actions">
        <button type="submit" className="secondary-button" disabled={disabled}>
          Save folder layout
        </button>
        {saved && <span role="status">Layout saved.</span>}
      </div>
    </form>
  );
}
