import type { DemoCandidate, DemoTrack } from './demoData';

function filename(value: string) {
  return value
    .replace(/[<>:"/\\|?*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
export function demoDestination(
  track: DemoTrack,
  folder: string,
  layout: string,
  separate: boolean,
  provider: DemoCandidate['provider'],
  anotherCopy = false,
) {
  const root = (folder.trim() || 'Music/Auto Digger').replace(/\/+$/, '');
  const release = `${filename(track.artist)} - ${filename(track.release)} [r${track.releaseId.toString()}]`;
  const suffix = anotherCopy && !separate ? ` [${provider}]` : '';
  return [
    root,
    ...(separate ? [provider] : []),
    ...(layout === 'release' ? [release] : []),
    `${track.position} - ${filename(track.title)}${suffix}.mp3`,
  ].join('/');
}
