export function isEp(formats: string[]): boolean {
  return formats.some((format) =>
    format.split(',').some((part) => part.trim().toUpperCase() === 'EP'),
  );
}
