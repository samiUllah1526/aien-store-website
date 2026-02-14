/**
 * Cart icon with item count. Opens cart sidebar on click.
 */

import { useCart } from '../../store/cartStore';

export default function CartIcon() {
  const { totalItems, toggleCart } = useCart();

  return (
    <button
      type="button"
      onClick={toggleCart}
      className="relative p-2 text-charcoal dark:text-cream hover:text-emerald transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-emerald/50 focus:ring-offset-2 focus:ring-offset-cream dark:focus:ring-offset-ink rounded"
      aria-label={`Cart, ${totalItems} items`}
    >
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
        />
      </svg>
      {totalItems > 0 && (
        <span
          className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald text-cream text-xs font-medium"
          aria-hidden
        >
          {totalItems > 99 ? '99+' : totalItems}
        </span>
      )}
    </button>
  );
}
