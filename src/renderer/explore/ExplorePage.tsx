import { useLayoutEffect, useRef, useState } from 'react';
import type { DiscogsBridge } from '../../shared/discogs';
import { followTopicKey } from '../../shared/following';
import type { FollowTopic } from '../../shared/following';
import type { useFollowing } from '../following/use-following';
import { FollowingContext } from '../following/following-context';
import { FollowingPanel } from '../following/FollowingPanel';
import { ReleaseAudioDetails } from '../audio/ReleaseAudioDetails';
import type { useAudioLibrary } from '../audio/use-audio-library';
import type { useCrate } from '../crate/use-crate';
import { useExplore } from './use-explore';
import { YearComparisonForm } from './YearComparisonForm';
import { ExploreResults } from './ExploreResults';
import { sleevePreview } from './sleeve-preview';
import { ReleaseShelf } from './ReleaseShelf';
import { CataloguePage } from './CataloguePage';
import { ExploreToolbar } from './ExploreToolbar';
import type { ExploreSection } from './ExploreToolbar';
import type { useStarterShelf } from './use-starter-shelf';

export function ExplorePage({
  bridge,
  connected,
  onUnauthorized,
  starterShelf,
  followsShelf,
  markSeen,
  following,
  crate,
  audio,
}: {
  bridge: DiscogsBridge | undefined;
  connected: boolean;
  onUnauthorized: () => void;
  starterShelf: ReturnType<typeof useStarterShelf>;
  followsShelf: ReturnType<typeof useStarterShelf>;
  markSeen: (id: number) => void;
  following: ReturnType<typeof useFollowing>;
  crate: ReturnType<typeof useCrate>;
  audio: ReturnType<typeof useAudioLibrary>;
}) {
  const scrollContainer = useRef<HTMLDivElement>(null);
  const cataloguePosition = useRef(0);
  const restoreCataloguePosition = useRef(false);
  const [section, setSection] = useState<ExploreSection>('Feed');
  const catalogue = section === 'Catalogue';
  const explore = useExplore(bridge, onUnauthorized);
  const { topic, release, view, busy, error } = explore;
  useLayoutEffect(() => {
    if (catalogue && !release && restoreCataloguePosition.current) {
      scrollContainer.current?.scrollTo(0, cataloguePosition.current);
      restoreCataloguePosition.current = false;
    }
  }, [catalogue, release]);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const loadPreview = bridge?.previewRelease;
  const audioBridge = audio.bridge;
  const preview =
    loadPreview && audioBridge
      ? (id: number) => {
          setPreviewError(null);
          setPreviewBusy(true);
          sleevePreview(
            loadPreview,
            audioBridge.probe,
            (input, releaseId) => audio.preview(input, releaseId),
            id,
            audio.tracks,
          )
            .then((result) => {
              if (!result.ok) {
                if (result.error.code === 'unauthorized') onUnauthorized();
                setPreviewError(result.error.message);
              }
            })
            .catch(() => {
              setPreviewError('The preview could not start. Please retry.');
            })
            .finally(() => {
              setPreviewBusy(false);
            });
        }
      : undefined;
  const disabled = !connected || busy;
  const browse = (next: FollowTopic, page?: number) => {
    setSection('Following');
    scrollContainer.current?.scrollTo(0, 0);
    explore.browse(next, page).catch(() => undefined);
  };
  const open = (id: number) => {
    if (catalogue) cataloguePosition.current = scrollContainer.current?.scrollTop ?? 0;
    explore.open(id, markSeen).catch(() => undefined);
  };
  const selectSection = (next: ExploreSection) => {
    if (section === next && !release && !view && !topic && !error) return;
    explore.reset();
    setSection(next);
    scrollContainer.current?.scrollTo(0, 0);
  };
  const discover = () => {
    scrollContainer.current?.scrollTo(0, 0);
    explore.discover().catch(() => undefined);
  };
  const canDiscover =
    connected &&
    !catalogue &&
    explore.discoverAvailable &&
    following.topics.length > 0 &&
    (!topic || following.isFollowed(topic));
  return (
    <div className="explore-page" ref={scrollContainer}>
      <ExploreToolbar
        section={section}
        busy={busy}
        connected={connected}
        refreshBusy={starterShelf.busy || followsShelf.busy}
        onSelect={selectSection}
        onRefresh={() => {
          explore.reset();
          starterShelf.refresh();
          followsShelf.refresh();
        }}
        onDiscover={canDiscover && !release ? discover : undefined}
        onAllFollowed={
          section === 'Following' && (topic || view) && !release
            ? () => {
                explore.reset();
                scrollContainer.current?.scrollTo(0, 0);
              }
            : undefined
        }
      />
      {catalogue && connected && bridge && (
        <div hidden={Boolean(release)}>
          <CataloguePage
            bridge={bridge}
            busy={busy}
            onOpen={open}
            onUnauthorized={onUnauthorized}
          />
        </div>
      )}
      {catalogue && !release && error && (
        <p className="explore-notice" role="alert">
          {error}
        </p>
      )}
      {release && (
        <section className="explore-workspace" aria-label="Selected release">
          <button
            type="button"
            className="secondary-button explore-back"
            onClick={() => {
              restoreCataloguePosition.current = catalogue;
              explore.back();
            }}
          >
            {catalogue ? 'Back to Catalogue' : 'Back to Explore'}
          </button>
          <FollowingContext.Provider value={following}>
            <ReleaseAudioDetails
              key={release.id}
              release={release}
              crate={crate}
              audio={audio}
              artistBrowsingDisabled={disabled}
              onBrowseArtist={(artist) => {
                browse({ kind: 'artist', name: artist });
              }}
            />
          </FollowingContext.Provider>
        </section>
      )}
      {!release && (
        <>
          {!connected && (
            <p className="explore-notice">Connect Discogs to browse and discover releases.</p>
          )}
          {previewError && (
            <p role="alert" className="explore-notice">
              {previewError}
            </p>
          )}
          {busy && (
            <p className="explore-notice" role="status">
              Loading releases…
            </p>
          )}
          {!catalogue && error && (
            <p className="explore-notice" role="alert">
              {error}
            </p>
          )}
          {connected && section === 'Feed' && !view && (
            <>
              <ReleaseShelf
                title="Discover records"
                headingId="explore-starter-heading"
                shelf={starterShelf}
                disabled={disabled}
                open={open}
                preview={preview}
                previewBusy={previewBusy || Boolean(audio.preparingPreview)}
              />
              {following.topics.length > 0 && (
                <ReleaseShelf
                  title="From your follows"
                  headingId="explore-follows-heading"
                  shelf={followsShelf}
                  disabled={disabled}
                  open={open}
                  preview={preview}
                  previewBusy={previewBusy || Boolean(audio.preparingPreview)}
                />
              )}
            </>
          )}
          {section === 'Following' && (
            <div hidden={Boolean(topic ?? view)}>
              <FollowingPanel
                following={following}
                browseDisabled={disabled}
                onBrowse={browse}
                lookup={connected ? bridge?.topicArtwork : undefined}
                onUnauthorized={onUnauthorized}
              />
            </div>
          )}
          {section === 'Following' && topic && (
            <header className="explore-tools">
              <h2>{topic.name}</h2>
              {topic.kind === 'genre' && (
                <YearComparisonForm
                  key={followTopicKey(topic)}
                  disabled={disabled}
                  compare={(first, second) => {
                    explore.compare(first, second).catch(() => undefined);
                  }}
                />
              )}
            </header>
          )}
          {!catalogue && view && (
            <ExploreResults
              view={view}
              disabled={disabled}
              open={open}
              paginate={(page) => {
                if (topic) browse(topic, page);
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
