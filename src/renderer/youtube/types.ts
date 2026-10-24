export interface YouTubeInstance {
  destroy: () => void;
  pauseVideo: () => void;
}
export interface YouTubeOptions {
  videoId: string;
  width: string;
  height: string;
  playerVars: { playsinline: number; autoplay: number; origin?: string };
  events: {
    onReady: () => void;
    onStateChange: (event: { data: number }) => void;
    onError: (event: { data: number }) => void;
    onAutoplayBlocked: () => void;
  };
}
export interface YouTubeApi {
  Player: new (element: HTMLElement, options: YouTubeOptions) => YouTubeInstance;
}
declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}
