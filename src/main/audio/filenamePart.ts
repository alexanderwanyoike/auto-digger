export function filenamePart(value: string): string {
  let safe = Array.from(value)
    .filter((character) => (character.codePointAt(0) ?? 0) >= 32)
    .join('')
    .replace(/[<>:"/\\|?*]/g, '')
    .trim()
    .replace(/\.+$/g, '');
  while (Buffer.byteLength(safe) > 70) safe = safe.slice(0, -1);
  return safe || 'Unknown';
}
