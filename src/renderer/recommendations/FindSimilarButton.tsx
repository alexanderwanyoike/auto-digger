import { useContext } from 'react';
import { AudioLines } from 'lucide-react';
import type { RecommendationSeed } from './RecommendationsContext';
import { RecommendationsContext } from './RecommendationsContext';

export function FindSimilarButton({
  seed,
  disabled,
}: {
  seed: RecommendationSeed;
  disabled: boolean;
}) {
  const recommendations = useContext(RecommendationsContext);
  if (!recommendations?.enabled) return null;
  return (
    <button
      type="button"
      className="secondary-button source-recommend"
      title="Find similar tracks with Cosine Club"
      aria-label={`Find similar to ${seed.title}`}
      disabled={disabled}
      onClick={() => {
        recommendations.find(seed);
      }}
    >
      <AudioLines size={13} aria-hidden="true" />
    </button>
  );
}
