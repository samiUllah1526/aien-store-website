import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { favoritesApi, getApiBaseUrl } from '../../lib/api';
import { formatMoney } from '../../lib/formatMoney';

interface ProductLike {
  id: string;
  slug: string;
  name: string;
  price: number;
  currency: string;
  image: string;
  images?: string[];
}

export default function FavoritesPage() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn());
  const [products, setProducts] = useState<ProductLike[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isLoggedIn) {
      window.location.href = '/login?returnTo=' + encodeURIComponent('/account/favorites');
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    favoritesApi
      .list()
      .then((data) => {
        if (!cancelled) setProducts(Array.isArray(data) ? (data as ProductLike[]) : []);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load favorites');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  const handleRemove = async (productId: string) => {
    try {
      await favoritesApi.remove(productId);
      setProducts((prev) => prev.filter((p) => p.id !== productId));
    } catch {
      setError('Failed to remove from favorites');
    }
  };

  if (!isLoggedIn || loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="text-charcoal/70 dark:text-cream/70">Loading…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 text-red-800 dark:text-red-300 text-sm">
        {error}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-sand dark:border-charcoal-light bg-cream/50 dark:bg-ink/30 p-12 text-center">
        <p className="text-charcoal dark:text-cream/90 font-medium">No favorites yet</p>
        <p className="mt-1 text-sm text-charcoal/70 dark:text-cream/70">
          Save items you love from the shop — they’ll show up here.
        </p>
        <a
          href="/shop"
          className="mt-6 inline-block rounded-lg bg-ink dark:bg-cream px-5 py-2.5 text-cream dark:text-ink font-medium hover:opacity-90 transition-opacity"
        >
          Browse shop
        </a>
      </div>
    );
  }

  const baseUrl = getApiBaseUrl().replace(/\/$/, '');
  const imageUrl = (img: string) =>
    img && (img.startsWith('http') ? img : `${baseUrl}${img.startsWith('/') ? '' : '/'}${img}`);

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <div
          key={product.id}
          className="group relative rounded-xl border border-sand dark:border-charcoal-light bg-white dark:bg-charcoal/50 overflow-hidden shadow-soft hover:shadow-mid transition-shadow"
        >
          <a href={`/shop/${product.slug}`} className="block">
            <div className="aspect-[3/4] overflow-hidden bg-sand/50 dark:bg-charcoal-light/50">
              <img
                src={imageUrl(product.image)}
                alt=""
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              />
            </div>
            <div className="p-4">
              <h2 className="font-medium text-ink dark:text-cream line-clamp-2">{product.name}</h2>
              <p className="mt-1 text-emerald font-medium">
                {formatMoney(product.price, product.currency)}
              </p>
            </div>
          </a>
          <button
            type="button"
            onClick={() => handleRemove(product.id)}
            className="absolute right-3 top-3 w-10 h-10 rounded-full bg-white/95 dark:bg-ink/95 shadow flex items-center justify-center text-charcoal dark:text-cream hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-emerald/50"
            aria-label="Remove from favorites"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
