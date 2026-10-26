export function supportedUrl(value: string, hosts: string[]): string | null {
  if (!URL.canParse(value)) return null;
  const url = new URL(value);
  return url.protocol === 'https:' && hosts.includes(url.hostname) ? url.href : null;
}
