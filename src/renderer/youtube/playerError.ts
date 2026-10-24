export function playerError(code: number): string {
  if (code === 100) return 'This video is private or no longer available. Choose another video.';
  if (code === 101 || code === 150)
    return 'Embedding is disabled for this video. Choose another video.';
  if (code === 153)
    return 'YouTube could not verify this desktop player. Retry or choose another video.';
  return 'YouTube could not play this video. Retry or choose another video.';
}
