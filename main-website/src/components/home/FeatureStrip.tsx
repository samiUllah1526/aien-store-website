/**
 * Feature strip: Customer Support, Easy Exchange, Shipping.
 * Mobile: single column, centered. md+: three columns — left / center / right within the container.
 */

import { featureStrip } from '../../config';

const iconClass = 'w-12 h-12 shrink-0 rounded-full bg-ash/20 flex items-center justify-center text-soft-charcoal dark:text-off-white';
const titleClass = 'font-display text-sm uppercase tracking-wider text-soft-charcoal dark:text-off-white';
const descClass = 'text-sm text-ash mt-1 max-w-xs';

export default function FeatureStrip() {
  return (
    <section className="border-t border-ash/20 bg-bone dark:bg-charcoal" aria-label="Services">
      <div className="w-full py-12 md:py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12">
          <div className="flex w-full flex-col items-center text-center md:items-center md:text-center">
            <span className={iconClass} aria-hidden>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </span>
            <h3 className={titleClass + ' mt-4'}>Customer Support</h3>
            <p className={descClass}>{featureStrip.supportText}</p>
          </div>
          <div className="flex w-full flex-col items-center text-center md:items-center">
            <span className={iconClass} aria-hidden>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </span>
            <h3 className={titleClass + ' mt-4'}>Easy Exchange</h3>
            <p className={descClass}>{featureStrip.exchangeText}</p>
          </div>
          <div className="flex w-full flex-col items-center text-center md:items-center md:text-center">
            <span className={iconClass} aria-hidden>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            </span>
            <h3 className={titleClass + ' mt-4'}>Shipping</h3>
            <p className={descClass}>{featureStrip.shippingText}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
