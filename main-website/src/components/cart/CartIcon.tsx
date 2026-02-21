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
      className="relative p-2 text-soft-charcoal dark:text-off-white hover:text-ash transition-colors duration-300 focus-ring rounded"
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
          className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-soft-charcoal dark:bg-off-white text-bone dark:text-charcoal text-xs font-medium"
          aria-hidden
        >
          {totalItems > 99 ? '99+' : totalItems}
        </span>
      )}
    </button>
  );
}
