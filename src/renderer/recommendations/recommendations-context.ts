import { createContext } from 'react';
import type { DiscogsRelease } from '../../shared/discogs';

export interface RecommendationSeed {
  release: DiscogsRelease;
  videoIndex: number;
  title: string;
}
export const RecommendationsContext = createContext<{
  enabled: boolean;
  find: (seed: RecommendationSeed) => void;
} | null>(null);
