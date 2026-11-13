export interface PlaybackItem {
  preview?: boolean;
  sleeveReleaseId?: number | undefined;
  releaseId?: number;
  id: string;
  title: string;
  artist: string;
  album: string;
  artworkUrl: string | null;
  url: string;
}
