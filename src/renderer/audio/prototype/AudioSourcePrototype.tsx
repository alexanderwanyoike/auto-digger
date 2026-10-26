import { useState } from 'react';

export function AudioSourcePrototype() {
  const [query, setQuery] = useState('Low Tide - Quiet Orbit (Original Mix)');
  const cleaned = query.replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  return (
    <section className="section-page" aria-label="Audio sources prototype">
      <h2>Audio sources prototype</h2>
      <p>Demo data. No searches, downloads or files leave this page.</p>
      <h3>Quiet Orbit (Original Mix)</h3>
      <label htmlFor="prototype-query">
        Soulseek search query
        <input
          id="prototype-query"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
          }}
        />
      </label>
      <output aria-label="Soulseek query sent">{cleaned}</output>
    </section>
  );
}
