import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
import { ExploreCollectionPage, discoveryTitles } from './ExploreCollectionPage';
import type { ExploreCollection } from './ExploreCollectionPage';
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
  playerRelease,
  onPlayerReleaseOpened,
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
  playerRelease: { id: number } | null;
  onPlayerReleaseOpened: () => void;
  following: ReturnType<typeof useFollowing>;
  crate: ReturnType<typeof useCrate>;
  audio: ReturnType<typeof useAudioLibrary>;
}) {
  const scrollContainer = useRef<HTMLDivElement>(null);
  const releasePosition = useRef(0);
  const collectionPosition = useRef(0);
  const restorePosition = useRef<number | null>(null);
  const returnFocus = useRef<string | null>(null);
  const collectionHeading = useRef<HTMLHeadingElement>(null);
  const [collection, setCollection] = useState<ExploreCollection | null>(null);
  const [section, setSection] = useState<ExploreSection>('Feed');
  const catalogue = section === 'Catalogue';
  const releaseBackLabel = catalogue ? 'Back to Catalogue' : 'Back to Explore';
  const explore = useExplore(bridge, onUnauthorized);
  const { topic, release, view, busy, error } = explore;
  useLayoutEffect(() => {
    if (release) scrollContainer.current?.scrollTo(0, 0);
    else if (restorePosition.current !== null) {
      scrollContainer.current?.scrollTo(0, restorePosition.current);
      restorePosition.current = null;
    }
  }, [collection, release]);

  useLayoutEffect(() => {
    if (collection) collectionHeading.current?.focus({ preventScroll: true });
    else if (returnFocus.current) {
      document.getElementById(returnFocus.current)?.focus({ preventScroll: true });
      returnFocus.current = null;
    }
  }, [collection]);

  const showCollection = (next: ExploreCollection, opener: string) => {
    returnFocus.current = opener;
    collectionPosition.current = scrollContainer.current?.scrollTop ?? 0;
    setCollection(next);
    scrollContainer.current?.scrollTo(0, 0);
  };
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
    returnFocus.current = null;
    setCollection(null);
    setSection('Following');
    scrollContainer.current?.scrollTo(0, 0);
    explore.browse(next, page).catch(() => undefined);
  };
  const open = (id: number) => {
    releasePosition.current = scrollContainer.current?.scrollTop ?? 0;
    explore.open(id, markSeen).catch(() => undefined);
  };
  useEffect(() => {
    if (!playerRelease || busy) return;
    if (release?.id !== playerRelease.id) open(playerRelease.id);
    onPlayerReleaseOpened();
  }, [playerRelease, busy, release, open, onPlayerReleaseOpened]);

  const selectSection = (next: ExploreSection) => {
    if (section === next && !collection && !release && !view && !topic && !error) return;
    explore.reset();
    returnFocus.current = null;
    setCollection(null);
    setSection(next);
    scrollContainer.current?.scrollTo(0, 0);
  };
  const discover = () => {
    scrollContainer.current?.scrollTo(0, 0);
    explore.discover().catch(() => undefined);
  };
  const canDiscover =
    connected &&
    !collection &&
    !catalogue &&
    explore.discoverAvailable &&
    following.topics.length > 0 &&
    (!topic || following.isFollowed(topic));
  return (
    <div className="explore-page" ref={scrollContainer}>
      <ExploreToolbar
        section={section}
        busy={busy}
        refreshBusy={starterShelf.busy || followsShelf.busy}
        onSelect={selectSection}
        onRefresh={
          connected && section === 'Feed' && !collection
            ? () => {
                explore.reset();
                starterShelf.refresh();
                followsShelf.refresh();
              }
            : undefined
        }
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
        <div hidden={Boolean(release ?? collection)}>
          <CataloguePage
            bridge={bridge}
            busy={busy}
            onOpen={open}
            onShowYear={(style, group) => {
              showCollection(
                { kind: 'year', style, group },
                `explore-year-more-${group.year.toString()}`,
              );
            }}
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
              restorePosition.current = releasePosition.current;
              explore.back();
            }}
          >
            {collection ? 'Back to results' : releaseBackLabel}
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
      {collection && bridge && connected && (
        <div hidden={Boolean(release)}>
          <ExploreCollectionPage
            collection={collection}
            headingRef={collectionHeading}
            bridge={bridge}
            seed={collection.kind === 'starter' ? starterShelf.releases : followsShelf.releases}
            seen={starterShelf.seen}
            playingReleaseId={audio.playback.track?.releaseId}
            disabled={disabled}
            onBack={() => {
              restorePosition.current = collectionPosition.current;
              setCollection(null);
            }}
            onOpen={open}
            onPreview={preview}
            previewBusy={previewBusy || Boolean(audio.preparingPreview)}
            onUnauthorized={onUnauthorized}
          />
        </div>
      )}
      {section === 'Following' && (
        <div hidden={Boolean(release ?? topic ?? view)}>
          <FollowingPanel
            following={following}
            browseDisabled={disabled}
            onBrowse={browse}
            onPageChange={() => {
              scrollContainer.current?.scrollTo(0, 0);
            }}
            lookup={connected ? bridge?.topicArtwork : undefined}
            active={!release && !topic && !view}
            onUnauthorized={onUnauthorized}
          />
        </div>
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
          {connected && section === 'Feed' && !view && !collection && (
            <>
              <ReleaseShelf
                title={discoveryTitles.starter}
                headingId="explore-starter-heading"
                shelf={starterShelf}
                onShowMore={
                  bridge?.expandDiscovery
                    ? () => {
                        showCollection({ kind: 'starter' }, 'explore-starter-heading-more');
                      }
                    : undefined
                }
                disabled={disabled}
                open={open}
                preview={preview}
                previewBusy={previewBusy || Boolean(audio.preparingPreview)}
              />
              {following.topics.length > 0 && (
                <ReleaseShelf
                  title={discoveryTitles.follows}
                  headingId="explore-follows-heading"
                  shelf={followsShelf}
                  onShowMore={
                    bridge?.expandDiscovery
                      ? () => {
                          showCollection({ kind: 'follows' }, 'explore-follows-heading-more');
                        }
                      : undefined
                  }
                  disabled={disabled}
                  open={open}
                  preview={preview}
                  previewBusy={previewBusy || Boolean(audio.preparingPreview)}
                />
              )}
            </>
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
