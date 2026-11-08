import { createContext } from 'react';
import type { usePlaylists } from './use-playlists';

export const PlaylistsContext = createContext<ReturnType<typeof usePlaylists> | null>(null);
