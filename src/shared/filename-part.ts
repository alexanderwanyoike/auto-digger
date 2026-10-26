export function filenamePart(value: string): string {
  let safe = Array.from(value)
    .filter((character) => (character.codePointAt(0) ?? 0) >= 32)
    .join('')
    .replace(/[<>:"/\\|?*]/g, '')
    .trim()
    .replace(/\.+$/g, '');
  const encoder = new TextEncoder();
  while (encoder.encode(safe).length > 70) safe = safe.slice(0, -1);
  return safe || 'Unknown';
}

export function folderPart(value: string): string {
  const safe = filenamePart(value).trim();
  return /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(safe) ? `_${safe}` : safe;
}
