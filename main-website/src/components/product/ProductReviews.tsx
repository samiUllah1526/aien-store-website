/**
 * Product reviews: public list + aggregate rating, with a verified-buyer-only
 * submission form. Reviews can only be written by customers who have a
 * fulfilled order containing this product (enforced server-side).
 */

import { useEffect, useMemo, useState } from 'react';
import { reviewsApi, type ReviewDto, type ReviewEligibility, type ReviewSummary } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { showToast } from '../../store/toastStore';

const DEFAULT_PAGE_SIZE = 10;

interface Props {
  productId: string;
  productName: string;
  /** Reviews rendered at build time (first page). Present in crawlable HTML. */
  initialReviews?: ReviewDto[];
  initialSummary?: ReviewSummary;
  initialTotal?: number;
  pageSize?: number;
}

function Stars({ value, size = 'md' }: { value: number; size?: 'sm' | 'md' }) {
  const px = size === 'sm' ? 'text-base' : 'text-xl';
  return (
    <span className={`inline-flex ${px} leading-none tracking-tight`} aria-hidden>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= Math.round(value) ? 'text-primary' : 'text-outline-variant'}>
          ★
        </span>
      ))}
    </span>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

export default function ProductReviews({
  productId,
  productName,
  initialReviews,
  initialSummary,
  initialTotal,
  pageSize = DEFAULT_PAGE_SIZE,
}: Props) {
  const hasInitial = Array.isArray(initialReviews);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn());
  const [reviews, setReviews] = useState<ReviewDto[]>(initialReviews ?? []);
  const [summary, setSummary] = useState<ReviewSummary>(
    initialSummary ?? { count: 0, average: 0, distribution: {} },
  );
  const [total, setTotal] = useState(initialTotal ?? initialReviews?.length ?? 0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(!hasInitial);
  const [eligibility, setEligibility] = useState<ReviewEligibility | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // When the page provided a build-time list, hydrate over it — no refetch.
    if (hasInitial) return;
    let cancelled = false;
    setLoading(true);
    reviewsApi
      .list(productId, { page: 1, limit: pageSize })
      .then((res) => {
        if (cancelled) return;
        setReviews(res.reviews);
        setSummary(res.summary);
        setTotal(res.total);
        setPage(1);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId, hasInitial, pageSize]);

  useEffect(() => {
    if (!isLoggedIn) {
      setEligibility(null);
      return;
    }
    let cancelled = false;
    reviewsApi
      .eligibility(productId)
      .then((e) => {
        if (!cancelled) setEligibility(e);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, productId]);

  const loadMore = async () => {
    const next = page + 1;
    try {
      const res = await reviewsApi.list(productId, { page: next, limit: pageSize });
      setReviews((prev) => [...prev, ...res.reviews]);
      setPage(next);
      setTotal(res.total);
    } catch {
      // ignore
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1) {
      showToast('Please select a star rating.', 'error');
      return;
    }
    if (body.trim().length < 3) {
      showToast('Please write a few words about the product.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const created = await reviewsApi.create(productId, {
        rating,
        title: title.trim() || undefined,
        body: body.trim(),
      });
      if (created) setReviews((prev) => [created, ...prev]);
      setTotal((t) => t + 1);
      setSummary((s) => {
        const count = s.count + 1;
        const average = Math.round(((s.average * s.count + rating) / count) * 10) / 10;
        const distribution = { ...s.distribution };
        distribution[String(rating)] = (distribution[String(rating)] ?? 0) + 1;
        return { count, average, distribution };
      });
      setEligibility((prev) => (prev ? { ...prev, canReview: false, alreadyReviewed: true } : prev));
      setShowForm(false);
      setRating(0);
      setTitle('');
      setBody('');
      showToast('Thanks! Your review has been published.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not submit your review.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const distributionRows = useMemo(() => {
    return [5, 4, 3, 2, 1].map((star) => {
      const n = summary.distribution?.[String(star)] ?? 0;
      const pct = summary.count > 0 ? Math.round((n / summary.count) * 100) : 0;
      return { star, n, pct };
    });
  }, [summary]);

  const returnTo =
    typeof window !== 'undefined'
      ? encodeURIComponent(window.location.pathname + window.location.search)
      : '';

  const renderWriteArea = () => {
    if (!isLoggedIn) {
      return (
        <p className="font-body-md text-on-surface-variant">
          Only verified buyers can review this product.{' '}
          <a href={`/login?returnTo=${returnTo}`} className="underline underline-offset-4 text-on-background hover:text-primary">
            Log in
          </a>{' '}
          to leave a review.
        </p>
      );
    }
    if (eligibility?.alreadyReviewed) {
      return (
        <p className="font-body-md text-on-surface-variant">
          You&rsquo;ve already reviewed this product. Thank you!
        </p>
      );
    }
    if (eligibility && !eligibility.hasVerifiedPurchase) {
      return (
        <p className="font-body-md text-on-surface-variant">
          Only customers who purchased and received this item can review it.
        </p>
      );
    }
    if (!eligibility) {
      return <p className="font-body-md text-on-surface-variant">Checking your purchase history…</p>;
    }
    if (!showForm) {
      return (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="border border-primary text-primary font-sans text-button uppercase tracking-widest px-8 py-4 hover:bg-surface-container-low transition-colors focus-ring"
        >
          Write a review
        </button>
      );
    }
    return (
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <span className="font-sans text-label-caps uppercase block mb-2">Your rating</span>
          <div className="flex gap-1" onMouseLeave={() => setHoverRating(0)}>
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setRating(i)}
                onMouseEnter={() => setHoverRating(i)}
                aria-label={`${i} star${i > 1 ? 's' : ''}`}
                className={`text-3xl leading-none transition-colors focus-ring ${
                  i <= (hoverRating || rating) ? 'text-primary' : 'text-outline-variant'
                }`}
              >
                ★
              </button>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="review-title" className="font-sans text-label-caps uppercase block mb-2">
            Title <span className="text-on-surface-variant normal-case">(optional)</span>
          </label>
          <input
            id="review-title"
            type="text"
            value={title}
            maxLength={120}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Sum it up in a few words"
            className="w-full border border-outline-variant bg-transparent px-4 py-3 font-body-md text-on-background focus-ring"
          />
        </div>
        <div>
          <label htmlFor="review-body" className="font-sans text-label-caps uppercase block mb-2">
            Your review
          </label>
          <textarea
            id="review-body"
            value={body}
            maxLength={4000}
            rows={5}
            onChange={(e) => setBody(e.target.value)}
            placeholder={`What did you think of ${productName}?`}
            className="w-full border border-outline-variant bg-transparent px-4 py-3 font-body-md text-on-background focus-ring resize-y"
          />
        </div>
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="bg-primary text-on-primary font-sans text-button uppercase tracking-widest px-8 py-4 hover:bg-secondary transition-colors focus-ring disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : 'Submit review'}
          </button>
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="font-sans text-button uppercase tracking-widest px-6 py-4 text-on-surface-variant hover:text-on-background transition-colors focus-ring"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  };

  return (
    <section className="border-t border-outline-variant mt-16 pt-12" aria-labelledby="reviews-heading">
      <h2 id="reviews-heading" className="font-serif text-h3-section text-on-background mb-8">
        Customer Reviews
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mb-12">
        <div className="md:col-span-4">
          {summary.count > 0 ? (
            <div>
              <div className="flex items-baseline gap-3">
                <span className="font-serif text-h2-editorial text-on-background">
                  {summary.average.toFixed(1)}
                </span>
                <Stars value={summary.average} />
              </div>
              <p className="font-body-md text-on-surface-variant mt-2">
                Based on {summary.count} verified {summary.count === 1 ? 'review' : 'reviews'}
              </p>
            </div>
          ) : (
            <p className="font-body-md text-on-surface-variant">No reviews yet.</p>
          )}
        </div>

        {summary.count > 0 && (
          <div className="md:col-span-8 space-y-1.5">
            {distributionRows.map(({ star, n, pct }) => (
              <div key={star} className="flex items-center gap-3">
                <span className="font-sans text-label-caps w-10 shrink-0 text-on-surface-variant">
                  {star} ★
                </span>
                <div className="flex-1 h-2 bg-surface-container-low rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <span className="font-sans text-label-caps w-8 shrink-0 text-right text-on-surface-variant">
                  {n}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mb-14">{renderWriteArea()}</div>

      {loading ? (
        <p className="font-body-md text-on-surface-variant">Loading reviews…</p>
      ) : reviews.length === 0 ? (
        <p className="font-body-md text-on-surface-variant">
          Be the first to review {productName}.
        </p>
      ) : (
        <ul className="space-y-10">
          {reviews.map((r) => (
            <li key={r.id} className="border-b border-outline-variant pb-10 last:border-b-0">
              <div className="flex items-center justify-between gap-4 mb-2">
                <Stars value={r.rating} size="sm" />
                <span className="font-sans text-label-caps text-on-surface-variant">
                  {formatDate(r.createdAt)}
                </span>
              </div>
              {r.title && (
                <h3 className="font-serif text-body-lg text-on-background mb-1">{r.title}</h3>
              )}
              <p className="font-body-md text-on-surface-variant leading-relaxed whitespace-pre-line">
                {r.body}
              </p>
              <p className="mt-3 flex items-center gap-2 font-sans text-label-caps uppercase text-on-surface-variant">
                <span>{r.authorName}</span>
                {r.isVerified && (
                  <span className="inline-flex items-center gap-1 text-primary normal-case tracking-normal">
                    <span aria-hidden>✓</span> Verified Purchase
                  </span>
                )}
              </p>
              {r.adminReply && (
                <div className="mt-4 border-l-2 border-primary pl-4 bg-surface-container-low/50 py-3">
                  <p className="font-sans text-label-caps uppercase text-on-surface-variant mb-1">
                    Store response
                  </p>
                  <p className="font-body-md text-on-background leading-relaxed whitespace-pre-line">
                    {r.adminReply}
                  </p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {reviews.length < total && (
        <button
          type="button"
          onClick={loadMore}
          className="mt-10 border border-outline-variant text-on-background font-sans text-button uppercase tracking-widest px-8 py-4 hover:border-primary transition-colors focus-ring"
        >
          Load more reviews
        </button>
      )}
    </section>
  );
}
