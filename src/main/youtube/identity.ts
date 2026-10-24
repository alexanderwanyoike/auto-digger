export const applicationId = 'io.github.alexanderwanyoike.auto-digger';

export function playerHeaders(
  url: string,
  headers: Record<string, string>,
): Record<string, string> {
  if (!url.startsWith('https://www.youtube.com/embed/')) return headers;
  const forwarded = Object.fromEntries(
    Object.entries(headers).filter(([name]) => name.toLowerCase() !== 'referer'),
  );
  return { ...forwarded, Referer: `https://${applicationId}` };
}
