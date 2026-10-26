import type { usePreferences } from './usePreferences';
import { SettingsSelect } from './SettingsSelect';
import { DownloadFolders } from './DownloadFolders';

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
      <SettingsSelect
        label="Download organisation"
        value={preferences.value.layout}
        options={['flat', 'release', 'custom']}
        disabled={disabled}
        onSelect={(layout) => {
          preferences.save({ layout }).catch(() => undefined);
        }}
      />
      <p>
        Flat keeps files together. Folder per release groups EPs and albums by artist, title and
        Discogs ID.
      </p>
      {preferences.value.layout === 'custom' && (
        <DownloadFolders
          fields={preferences.value.folders ?? []}
          root={preferences.value.directory ?? 'Music/Auto Digger'}
          disabled={disabled}
          onChange={(folders) => {
            preferences.save({ folders }).catch(() => undefined);
          }}
        />
      )}
    </div>
  );
}
