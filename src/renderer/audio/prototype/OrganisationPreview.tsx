import { FolderOpen } from 'lucide-react';
import { demoDestination } from './destination';
import type { useAudioPrototype } from './useAudioPrototype';

export function OrganisationPreview({ state }: { state: ReturnType<typeof useAudioPrototype> }) {
  return (
    <aside className="prototype-organisation" aria-label="Library organisation">
      <div className="prototype-panel-title">
        <FolderOpen size={15} />
        <h3>A place for each record.</h3>
      </div>
      <p>Preview where the next copy would go. Existing copies keep their locations.</p>
      <label htmlFor="prototype-folder">
        Library folder
        <input
          id="prototype-folder"
          value={state.folder}
          onChange={(event) => {
            state.setFolder(event.target.value);
          }}
        />
      </label>
      <label htmlFor="prototype-layout">
        Folder layout
        <select
          id="prototype-layout"
          value={state.layout}
          onChange={(event) => {
            state.setLayout(event.target.value);
          }}
        >
          <option value="release">Folder per release</option>
          <option value="flat">All tracks together</option>
        </select>
      </label>
      <label className="prototype-check" htmlFor="prototype-separate">
        <input
          id="prototype-separate"
          type="checkbox"
          checked={state.separate}
          onChange={(event) => {
            state.setSeparate(event.target.checked);
          }}
        />
        Separate folders by source
      </label>
      <span className="eyebrow">NEXT SOULSEEK COPY</span>
      <output aria-label="Destination preview">
        {demoDestination(state.track, state.folder, state.layout, state.separate, 'Soulseek')}
      </output>
      <small>Folder preview only. No files are created or moved.</small>
    </aside>
  );
}
