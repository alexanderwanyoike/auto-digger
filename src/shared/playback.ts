export interface PlaybackItem {
  preview?: boolean;
  id: string;
  title: string;
  artist: string;
  album: string;
  artworkUrl: string | null;
  url: string;
}
