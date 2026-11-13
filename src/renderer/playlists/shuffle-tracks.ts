export function shuffleTracks<T>(tracks: readonly T[]) {
  const shuffled = [...tracks];
  let remaining = shuffled.length;
  while (remaining > 1) {
    const picked = Math.floor(Math.random() * remaining);
    remaining -= 1;
    const track = shuffled[picked];
    const last = shuffled[remaining];
    if (track === undefined || last === undefined) break;
    shuffled[picked] = last;
    shuffled[remaining] = track;
  }
  return shuffled;
}
