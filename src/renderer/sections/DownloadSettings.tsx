import type { usePreferences } from './use-preferences';
import { DownloadFolders } from './DownloadFolders';
import { currentFolderTemplate } from '../../shared/folder-template';

export function DownloadSettings({
  preferences,
}: {
  preferences: ReturnType<typeof usePreferences>;
}) {
  const disabled = preferences.busy || !preferences.available;
  return (
    <div className="settings-card">
      <h2>Downloads</h2>
      <p>These choices apply to new downloads. Existing tracks stay at their recorded locations.</p>
      <span className="download-location">
        {preferences.value.directory ?? 'Music/Auto Digger'}
      </span>
      <button
        type="button"
        className="secondary-button"
        disabled={disabled}
        onClick={() => {
          preferences.chooseDirectory().catch(() => undefined);
        }}
      >
        Choose downloads folder
      </button>
      <DownloadFolders
        template={currentFolderTemplate(preferences.value)}
        root={preferences.value.directory ?? 'Music/Auto Digger'}
        disabled={disabled}
        onSave={(folderTemplate) => preferences.save({ layout: 'custom', folderTemplate })}
      />
    </div>
  );
}
