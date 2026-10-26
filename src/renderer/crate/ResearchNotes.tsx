import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import type { ResearchNote } from '../../shared/research-notes';

const certaintyLabels = {
  confirmed: 'Confirmed',
  candidate: 'Candidate',
  unresolved: 'Unresolved',
};
export function ResearchNotes({ notes }: { notes: ResearchNote[] }) {
  const [error, setError] = useState<string | null>(null);
  async function open(note: ResearchNote, sourceIndex: number) {
    setError(null);
    try {
      const result = await window.researchAccess?.openSource({
        crateId: note.crateId,
        noteId: note.id,
        sourceIndex,
      });
      if (!result?.ok)
        setError(result?.error.message ?? 'Open the desktop app to follow this source.');
    } catch {
      setError('The source could not open. Please retry.');
    }
  }
  if (!notes.length) return null;
  return (
    <section className="research-notes" aria-label="Research notes">
      <header>
        <h2>Research notes</h2>
        <span>Matches and sources supplied by your research client.</span>
      </header>
      {error && <p role="alert">{error}</p>}
      <ol>
        {notes.map((note) => (
          <li key={note.id}>
            <div className="research-position">
              {note.trackNumber?.toString().padStart(2, '0') ?? '?'}
              {note.timestamp && <span>{note.timestamp}</span>}
            </div>
            <div className="research-note-copy">
              <strong>{note.artist ? `${note.artist} · ${note.title}` : note.title}</strong>
              <span className={`research-certainty research-${note.certainty}`}>
                {certaintyLabels[note.certainty]}
              </span>
              {note.notes && <p>{note.notes}</p>}
              <div className="research-sources">
                <button
                  type="button"
                  className="research-source"
                  aria-label={`Open mix source for ${note.title}`}
                  title={note.mixUrl}
                  onClick={() => {
                    open(note, -1).catch(() => undefined);
                  }}
                >
                  <ExternalLink size={12} aria-hidden="true" /> Mix source
                </button>
                {note.sourceUrls.map((url, index) => (
                  <button
                    key={`${index.toString()}-${url}`}
                    type="button"
                    className="research-source"
                    aria-label={`Open source ${(index + 1).toString()} for ${note.title}`}
                    title={url}
                    onClick={() => {
                      open(note, index).catch(() => undefined);
                    }}
                  >
                    Source {(index + 1).toString()}
                  </button>
                ))}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
