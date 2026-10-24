import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/manrope';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import { App } from './App';
import './styles/tokens.css';
import './styles/appearance.css';
import './styles/layout.css';
import './styles/panels.css';
import './styles/record.css';
import './styles/playback.css';
import './styles/compact.css';
import './styles/connection.css';
import './styles/release.css';
import './styles/search.css';
import './styles/artwork.css';
import './styles/taxonomy.css';
import './styles/downloads.css';
import './styles/crate.css';
import './styles/sections.css';
import './styles/materials.css';
import './styles/queue.css';
import './styles/library.css';
import './styles/research.css';
import './styles/appearanceSettings.css';
import './styles/deskPanels.css';
import './styles/fieldFocus.css';

const container = document.getElementById('root');

if (container) {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
