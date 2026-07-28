import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { hasPermission } from '../lib/auth';
import { toastSuccess } from '../lib/toast';
import { uploadReviewMediaAdmin } from '../lib/media-upload';
import { MediaLightbox, type LightboxMediaItem } from './MediaLightbox';

const SPOTLIGHT_ACCEPT =
  'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov';

interface SpotlightMedia {
  id: string;
  url: string;
  mimeType: string;
  kind: 'image' | 'video';
}

interface SpotlightItem {
  id: string;
  mediaId: string;
  caption: string | null;
  sortOrder: number;
  isActive: boolean;
  autoplay: boolean;
  media: SpotlightMedia;
}

interface SocialProofTitles {
  reviewsEyebrow: string;
  reviewsTitle: string;
  spotlightEyebrow: string;
  spotlightTitle: string;
}

const DEFAULT_TITLES: SocialProofTitles = {
  reviewsEyebrow: 'CUSTOMER LOVE',
  reviewsTitle: 'What they say',
  spotlightEyebrow: 'IN THE WILD',
  spotlightTitle: 'Customer Spotlight',
};

/**
 * Section titles + Customer Spotlight media manager for the Reviews admin page.
 */
export function SocialProofPanel() {
  const canRead = hasPermission('reviews:read');
  const canModerate = hasPermission('reviews:moderate');

  const [titles, setTitles] = useState<SocialProofTitles>(DEFAULT_TITLES);
  const [savingTitles, setSavingTitles] = useState(false);
  const [items, setItems] = useState<SpotlightItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [captionDraft, setCaptionDraft] = useState('');
  const [autoplayDraft, setAutoplayDraft] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxItems, setLightboxItems] = useState<LightboxMediaItem[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const load = useCallback(async () => {
    if (!canRead) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [titlesRes, spotlightRes] = await Promise.all([
        api.get<SocialProofTitles>('/spotlight/titles'),
        api.get<SpotlightItem[]>('/spotlight'),
      ]);
      const raw = titlesRes.data ?? DEFAULT_TITLES;
      setTitles({
        reviewsEyebrow: raw.reviewsEyebrow?.trim() || DEFAULT_TITLES.reviewsEyebrow,
        reviewsTitle: raw.reviewsTitle?.trim() || DEFAULT_TITLES.reviewsTitle,
        spotlightEyebrow: raw.spotlightEyebrow?.trim() || DEFAULT_TITLES.spotlightEyebrow,
        spotlightTitle: raw.spotlightTitle?.trim() || DEFAULT_TITLES.spotlightTitle,
      });
      setItems(Array.isArray(spotlightRes.data) ? spotlightRes.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load social proof settings');
    } finally {
      setLoading(false);
    }
  }, [canRead]);

  useEffect(() => {
    load();
  }, [load]);

  const saveTitles = async () => {
    setSavingTitles(true);
    setError(null);
    try {
      await api.put('/spotlight/titles', {
        reviewsEyebrow: titles.reviewsEyebrow.trim() || DEFAULT_TITLES.reviewsEyebrow,
        reviewsTitle: titles.reviewsTitle.trim() || DEFAULT_TITLES.reviewsTitle,
        spotlightEyebrow: titles.spotlightEyebrow.trim() || DEFAULT_TITLES.spotlightEyebrow,
        spotlightTitle: titles.spotlightTitle.trim() || DEFAULT_TITLES.spotlightTitle,
      });
      toastSuccess('Section titles saved. Redeploy website to publish.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save titles');
    } finally {
      setSavingTitles(false);
    }
  };

  const onUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const uploaded = await uploadReviewMediaAdmin(file);
      await api.post('/spotlight', {
        mediaId: uploaded.id,
        caption: captionDraft.trim() || undefined,
        isActive: true,
        autoplay: uploaded.kind === 'video' ? autoplayDraft : true,
      });
      setCaptionDraft('');
      setAutoplayDraft(true);
      toastSuccess('Spotlight item added');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload spotlight media');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const toggleActive = async (item: SpotlightItem) => {
    setBusyId(item.id);
    try {
      await api.patch(`/spotlight/${item.id}`, { isActive: !item.isActive });
      toastSuccess(item.isActive ? 'Hidden from homepage' : 'Shown on homepage');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update item');
    } finally {
      setBusyId(null);
    }
  };

  const toggleAutoplay = async (item: SpotlightItem) => {
    if (item.media.kind !== 'video') return;
    setBusyId(item.id);
    try {
      await api.patch(`/spotlight/${item.id}`, { autoplay: !item.autoplay });
      toastSuccess(item.autoplay ? 'Autoplay off — tap opens lightbox' : 'Autoplay on');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update autoplay');
    } finally {
      setBusyId(null);
    }
  };

  const removeItem = async (item: SpotlightItem) => {
    if (!confirm('Delete this spotlight item?')) return;
    setBusyId(item.id);
    try {
      await api.delete(`/spotlight/${item.id}`);
      toastSuccess('Spotlight item deleted');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete item');
    } finally {
      setBusyId(null);
    }
  };

  const moveItem = async (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= items.length) return;
    const ordered = [...items];
    const [row] = ordered.splice(index, 1);
    ordered.splice(next, 0, row);
    setItems(ordered);
    setBusyId(row.id);
    try {
      await api.put('/spotlight/reorder', { orderedIds: ordered.map((i) => i.id) });
      toastSuccess('Order updated');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder');
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const openLightbox = (item: SpotlightItem) => {
    setLightboxItems(
      items.map((i) => ({
        id: i.media.id,
        url: i.media.url,
        mimeType: i.media.mimeType,
        kind: i.media.kind,
      })),
    );
    setLightboxIndex(Math.max(0, items.findIndex((i) => i.id === item.id)));
    setLightboxOpen(true);
  };

  if (!canRead) return null;

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Homepage section titles</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Rename the Reviews and Customer Spotlight headings shown on the landing page.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Reviews eyebrow</span>
            <input
              value={titles.reviewsEyebrow}
              onChange={(e) => setTitles((t) => ({ ...t, reviewsEyebrow: e.target.value }))}
              disabled={!canModerate}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Reviews title</span>
            <input
              value={titles.reviewsTitle}
              onChange={(e) => setTitles((t) => ({ ...t, reviewsTitle: e.target.value }))}
              disabled={!canModerate}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Spotlight eyebrow</span>
            <input
              value={titles.spotlightEyebrow}
              onChange={(e) => setTitles((t) => ({ ...t, spotlightEyebrow: e.target.value }))}
              disabled={!canModerate}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Spotlight title</span>
            <input
              value={titles.spotlightTitle}
              onChange={(e) => setTitles((t) => ({ ...t, spotlightTitle: e.target.value }))}
              disabled={!canModerate}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
        </div>
        {canModerate && (
          <button
            type="button"
            onClick={saveTitles}
            disabled={savingTitles}
            className="mt-4 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-600 dark:hover:bg-slate-500"
          >
            {savingTitles ? 'Saving…' : 'Save titles'}
          </button>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Customer Spotlight</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Upload images or reels for a premium medium-card carousel below the Reviews section.
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-300" role="alert">
            {error}
          </div>
        )}

        {canModerate && (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="block min-w-0 flex-1 text-sm">
              <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Caption (optional)</span>
              <input
                value={captionDraft}
                onChange={(e) => setCaptionDraft(e.target.value)}
                maxLength={200}
                placeholder="Short caption"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
            </label>
            <label className="flex items-center gap-2 pb-2 text-sm text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={autoplayDraft}
                onChange={(e) => setAutoplayDraft(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Autoplay videos
            </label>
            <div>
              <input
                ref={fileRef}
                type="file"
                accept={SPOTLIGHT_ACCEPT}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void onUpload(file);
                }}
              />
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {uploading ? 'Uploading…' : 'Upload image / reel'}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="mt-6 h-24 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-700" />
        ) : items.length === 0 ? (
          <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">No spotlight items yet.</p>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item, index) => (
              <li
                key={item.id}
                className={`overflow-hidden rounded-lg border border-slate-200 dark:border-slate-600 ${
                  item.isActive ? '' : 'opacity-60'
                }`}
              >
                <button type="button" className="relative block aspect-[3/4] w-full bg-slate-100 dark:bg-slate-900" onClick={() => openLightbox(item)}>
                  {item.media.kind === 'video' ? (
                    <>
                      <video src={item.media.url} muted className="h-full w-full object-cover" />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-white text-sm">▶ Reel</span>
                    </>
                  ) : (
                    <img src={item.media.url} alt="" className="h-full w-full object-cover" />
                  )}
                </button>
                <div className="space-y-2 p-3">
                  <p className="line-clamp-2 text-sm text-slate-700 dark:text-slate-300">
                    {item.caption?.trim() || <span className="text-slate-400">No caption</span>}
                  </p>
                  <p className="text-xs text-slate-500">
                    {item.isActive ? 'Visible' : 'Hidden'}
                    {item.media.kind === 'video' && (
                      <> · {item.autoplay !== false ? 'Autoplay' : 'Tap to play'}</>
                    )}
                  </p>
                  {canModerate && (
                    <div className="flex flex-wrap gap-2 text-sm">
                      <button
                        type="button"
                        disabled={busyId === item.id || index === 0}
                        onClick={() => moveItem(index, -1)}
                        className="font-medium text-slate-600 hover:text-slate-900 disabled:opacity-40 dark:text-slate-300"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        disabled={busyId === item.id || index === items.length - 1}
                        onClick={() => moveItem(index, 1)}
                        className="font-medium text-slate-600 hover:text-slate-900 disabled:opacity-40 dark:text-slate-300"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => toggleActive(item)}
                        className="font-medium text-sky-600 hover:text-sky-800 disabled:opacity-50 dark:text-sky-400"
                      >
                        {item.isActive ? 'Hide' : 'Show'}
                      </button>
                      {item.media.kind === 'video' && (
                        <button
                          type="button"
                          disabled={busyId === item.id}
                          onClick={() => toggleAutoplay(item)}
                          className="font-medium text-violet-600 hover:text-violet-800 disabled:opacity-50 dark:text-violet-400"
                        >
                          {item.autoplay !== false ? 'Disable autoplay' : 'Enable autoplay'}
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => removeItem(item)}
                        className="font-medium text-red-600 hover:text-red-800 disabled:opacity-50 dark:text-red-400"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <MediaLightbox
        open={lightboxOpen}
        items={lightboxItems}
        index={lightboxIndex}
        onClose={() => setLightboxOpen(false)}
        onIndexChange={setLightboxIndex}
      />
    </div>
  );
}
