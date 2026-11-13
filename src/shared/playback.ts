export interface PlaybackItem {
  preview?: boolean;
  sleeveReleaseId?: number | undefined;
  id: string;
  title: string;
  artist: string;
  album: string;
  artworkUrl: string | null;
  url: string;
}
