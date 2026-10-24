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

const container = document.getElementById('root');

if (container) {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
