export const youtubeApiFixture = `
window.YT = {
  Player: class {
    constructor(element, options) {
      this.frame = document.createElement('iframe');
      this.frame.title = 'YouTube video player';
      this.frame.src = 'https://www.youtube.com/embed/' + options.videoId;
      element.replaceWith(this.frame);
      queueMicrotask(() => options.events.onReady());
    }
    destroy() { this.frame.remove(); }
    pauseVideo() {}
  }
};
window.onYouTubeIframeAPIReady();
`;
