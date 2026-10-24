import { Info } from 'lucide-react';

export function TrackNotice({ text, title }: { text: string; title: string }) {
  return (
    <details className="track-notice">
      <summary aria-label={`Note for ${title}`} title="Track note">
        <Info size={13} aria-hidden="true" />
      </summary>
      <p>{text}</p>
    </details>
  );
}
