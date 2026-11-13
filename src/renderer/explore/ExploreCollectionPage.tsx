import type { Ref } from 'react';
import { ArrowLeft } from 'lucide-react';
import type { DiscogsBridge } from '../../shared/discogs';
import type { DiscoveryShelf } from '../../shared/discovery';
import type { SearchPage } from '../../shared/search';
import { ReleaseMatchList } from '../discogs/ReleaseMatchList';
import { DiscoveryCollection } from './DiscoveryCollection';
import type { YearRecords } from './use-catalogue-records';
import { useScrollContinuation } from './use-scroll-continuation';
import { useCatalogueRecords } from './use-catalogue-records';

export type ExploreCollection =
  { kind: DiscoveryShelf } | { kind: 'year'; style: string; group: YearRecords };

export const discoveryTitles = {
  starter: 'Discover records',
  follows: 'From your follows',
};

type Releases = SearchPage['releases'];

function YearCollection({
  search,
  style,
  group,
  disabled,
  onOpen,
  onPreview,
  previewBusy,
  onUnauthorized,
}: {
  search: DiscogsBridge['search'];
  style: string;
  group: YearRecords;
  disabled: boolean;
  onOpen: (id: number) => void;
  onPreview: ((id: number) => void) | undefined;
  previewBusy: boolean;
  onUnauthorized: () => void;
}) {
  const records = useCatalogueRecords(search, style, group.year, onUnauthorized, group);
  const sentinel = useScrollContinuation(
    !disabled && !records.busy && !records.error && records.morePages
      ? () => {
          records.loadMore(undefined);
        }
      : undefined,
  );
  return (
    <>
      <ReleaseMatchList
        releases={records.groups[0]?.releases ?? []}
        disabled={disabled}
        onOpen={onOpen}
        onPreview={onPreview}
        previewBusy={previewBusy}
      />
      <div className="catalogue-continuation" ref={sentinel}>
        {records.busy && <p role="status">Loading releases…</p>}
        {records.error && <p role="alert">{records.error}</p>}
        {records.error && (
          <button className="secondary-button" type="button" onClick={records.retry}>
            Retry
          </button>
        )}
      </div>
    </>
  );
}

export function ExploreCollectionPage({
  collection,
  headingRef,
  bridge,
  seed,
  seen,
  playingReleaseId,
  disabled,
  onBack,
  onOpen,
  onPreview,
  previewBusy,
  onUnauthorized,
}: {
  collection: ExploreCollection;
  headingRef: Ref<HTMLHeadingElement>;
  bridge: DiscogsBridge;
  seed: Releases;
  seen: ReadonlySet<number>;
  playingReleaseId: number | undefined;
  disabled: boolean;
  onBack: () => void;
  onOpen: (id: number) => void;
  onPreview: ((id: number) => void) | undefined;
  previewBusy: boolean;
  onUnauthorized: () => void;
}) {
  const year = collection.kind === 'year';
  const title = year ? collection.group.year : discoveryTitles[collection.kind];
  return (
    <section
      className="explore-shelf explore-collection"
      aria-labelledby="explore-collection-heading"
    >
      <button type="button" className="explore-action" onClick={onBack} disabled={disabled}>
        <ArrowLeft size={15} aria-hidden="true" /> {year ? 'Back to Catalogue' : 'Back to Feed'}
      </button>
      <header className="explore-shelf-header">
        <h2 id="explore-collection-heading" ref={headingRef} tabIndex={-1}>
          {title}
        </h2>
        {year && <span>{collection.style}</span>}
      </header>
      {year ? (
        <YearCollection
          search={bridge.search}
          style={collection.style}
          group={collection.group}
          onPreview={onPreview}
          previewBusy={previewBusy}
          disabled={disabled}
          onOpen={onOpen}
          onUnauthorized={onUnauthorized}
        />
      ) : (
        bridge.expandDiscovery && (
          <DiscoveryCollection
            load={bridge.expandDiscovery}
            kind={collection.kind}
            seed={seed}
            seen={seen}
            playingReleaseId={playingReleaseId}
            disabled={disabled}
            onOpen={onOpen}
            onPreview={onPreview}
            previewBusy={previewBusy}
            onUnauthorized={onUnauthorized}
          />
        )
      )}
    </section>
  );
}
