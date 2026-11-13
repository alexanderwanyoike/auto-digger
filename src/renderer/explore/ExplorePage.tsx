import { useRef, useState } from 'react';
import { CataloguePage } from './CataloguePage';
import { Shuffle } from 'lucide-react';
import type { DiscogsBridge } from '../../shared/discogs';
import type { FollowTopic } from '../../shared/following';
import type { useFollowing } from '../following/use-following';
import { FollowingContext } from '../following/following-context';
import { FollowingPanel } from '../following/FollowingPanel';
import { ReleaseAudioDetails } from '../audio/ReleaseAudioDetails';
import type { useAudioLibrary } from '../audio/use-audio-library';
import type { useCrate } from '../crate/use-crate';
import { useExplore } from './use-explore';
import { ExploreResults } from './ExploreResults';
import { sleevePreview } from './sleeve-preview';
import { ReleaseShelf } from './ReleaseShelf';
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
  const [catalogue, setCatalogue] = useState(false);
  const explore = useExplore(bridge, onUnauthorized);
  const { topic, release, view, busy, error } = explore;
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
    setCatalogue(false);
    scrollContainer.current?.scrollTo(0, 0);
    explore.browse(next, page).catch(() => undefined);
  };
  const open = (id: number) => {
    explore.open(id, markSeen).catch(() => undefined);
  };
  return (
    <div className="explore-page" ref={scrollContainer}>
      {catalogue && connected && bridge && (
        <div hidden={Boolean(release)}>
          <CataloguePage
            bridge={bridge}
            onOpen={open}
            onUnauthorized={onUnauthorized}
            onBack={() => setCatalogue(false)}
          />
        </div>
      )}
      {catalogue && !release && error && (
        <p className="explore-notice" role="alert">
          {error}
        </p>
      )}
      {release ? (
        <section className="explore-workspace" aria-label="Selected release">
          <button type="button" className="secondary-button explore-back" onClick={explore.back}>
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
      ) : !catalogue || !connected ? (
        <>
          {connected && !topic && (
            <ReleaseShelf
              title="Discover records"
              headingId="explore-starter-heading"
              shelf={starterShelf}
              disabled={disabled}
              open={open}
              refreshBusy={followsShelf.busy}
              preview={preview}
              previewBusy={previewBusy || Boolean(audio.preparingPreview)}
              refresh={() => {
                starterShelf.refresh();
                followsShelf.refresh();
              }}
            />
          )}
          {connected && !topic && following.topics.length > 0 && (
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
          {previewError && (
            <p role="alert" className="explore-notice">
              {previewError}
            </p>
          )}
          {!connected && (
            <p className="explore-notice">Connect Discogs to browse and discover releases.</p>
          )}
          {busy && (
            <p className="explore-notice" role="status">
              Loading releases…
            </p>
          )}
          {error && (
            <p className="explore-notice" role="alert">
              {error}
            </p>
          )}
          {(topic !== null || following.topics.length > 0) && (
            <>
              <FollowingPanel following={following} browseDisabled={disabled} onBrowse={browse} />
              <section
                className="explore-workspace section-page"
                aria-labelledby="explore-catalogue-heading"
              >
                <header className="explore-tools">
                  <div className="explore-scope">
                    <h2 id="explore-catalogue-heading">{topic?.name ?? 'All followed'}</h2>
                    {topic && (
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={explore.reset}
                        disabled={busy}
                      >
                        All followed
                      </button>
                    )}
                    <button
                      type="button"
                      className="primary-button explore-discover"
                      disabled={
                        disabled ||
                        !explore.discoverAvailable ||
                        !following.topics.length ||
                        Boolean(topic && !following.isFollowed(topic))
                      }
                      onClick={() => {
                        explore.discover().catch(() => undefined);
                      }}
                    >
                      <Shuffle size={15} aria-hidden="true" /> Discover unseen releases
                    </button>
                  </div>
                </header>
                {view && (
                  <ExploreResults
                    view={view}
                    disabled={disabled}
                    open={open}
                    paginate={(page) => {
                      if (topic) browse(topic, page);
                    }}
                  />
                )}
              </section>
            </>
          )}
          {connected && !topic && (
            <footer className="explore-footer">
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  scrollContainer.current?.scrollTo(0, 0);
                  setCatalogue(true);
                }}
              >
                Catalogue
              </button>
            </footer>
          )}
        </>
      ) : null}
    </div>
  );
}
