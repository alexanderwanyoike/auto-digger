import { expect, test } from 'vitest';
import { videoId } from './youtubeVideoId';

test('accepts known HTTPS YouTube forms and rejects untrusted hosts or invalid IDs', () => {
  [
    'https://www.youtube.com/watch?v=abcdefghijk&feature=share',
    'https://youtu.be/abcdefghijk?t=5',
    'https://youtube.com/embed/abcdefghijk',
    'https://www.youtube.com/shorts/abcdefghijk',
  ].forEach((url) => {
    expect(videoId(url)).toBe('abcdefghijk');
  });
  [
    'https://youtube.com.evil.example/watch?v=abcdefghijk',
    'data:text/html,invalid',
    'https://www.youtube.com/watch?v=short',
    'https://example.com/abcdefghijk',
    'http://youtube.com/watch?v=abcdefghijk',
  ].forEach((url) => {
    expect(videoId(url)).toBeNull();
  });
});
