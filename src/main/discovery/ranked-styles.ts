import { filtersSchema } from '../../shared/search';

export function rankedStyles(taste: readonly { style: string }[]) {
  return taste.flatMap(({ style }) => {
    const parsed = filtersSchema.shape.style.safeParse([style]);
    return parsed.success ? parsed.data : [];
  });
}
