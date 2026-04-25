/**
 * NewsletterSection — editorial join-the-circle CTA.
 *
 * Submission is intentionally inert here; wire to a marketing endpoint when
 * the backend exposes one. The form is fully accessible and styled to match
 * the AIEN editorial system.
 */

import { useState, type FormEvent } from 'react';

interface NewsletterSectionProps {
  title?: string;
  body?: string;
  /** Optional custom submit handler. Receives the email address. */
  onSubmit?: (email: string) => Promise<void> | void;
}

type Status = 'idle' | 'loading' | 'success' | 'error';

export default function NewsletterSection({
  title = 'Join the AIEN Circle',
  body = 'Receive early access to new collections and exclusive editorial content.',
  onSubmit,
}: NewsletterSectionProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setStatus('loading');
    setMessage('');
    try {
      if (onSubmit) await onSubmit(trimmed);
      setStatus('success');
      setMessage('Thank you. Check your inbox for confirmation.');
      setEmail('');
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Something went wrong.');
    }
  };

  return (
    <section
      className="bg-primary text-on-primary py-24 md:py-28 text-center"
      aria-label="Newsletter signup"
    >
      <div className="max-w-2xl mx-auto px-6">
        <h2 className="font-serif text-h2-editorial mb-8">{title}</h2>
        <p className="font-body-lg text-on-primary/70 mb-12">{body}</p>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col md:flex-row gap-4 max-w-lg mx-auto border-b border-white/30 pb-2 focus-within:border-white transition-colors"
        >
          <label htmlFor="newsletter-email" className="sr-only">
            Email address
          </label>
          <input
            id="newsletter-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === 'loading'}
            required
            autoComplete="email"
            placeholder="YOUR EMAIL ADDRESS"
            className="flex-1 bg-transparent border-0 focus:ring-0 focus:outline-none w-full font-sans text-label-caps placeholder:text-white/40 text-on-primary"
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="font-sans text-label-caps uppercase whitespace-nowrap px-4 py-2 hover:opacity-70 transition-opacity disabled:opacity-50"
          >
            {status === 'loading' ? 'Sending…' : 'Subscribe'}
          </button>
        </form>

        <div className="min-h-[24px] mt-4" aria-live="polite">
          {status === 'success' && (
            <p className="font-sans text-label-caps text-secondary-fixed-dim">{message}</p>
          )}
          {status === 'error' && (
            <p className="font-sans text-label-caps text-error-container">{message}</p>
          )}
        </div>
      </div>
    </section>
  );
}
