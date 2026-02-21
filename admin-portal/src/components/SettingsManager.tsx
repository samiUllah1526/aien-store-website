import { useState, useEffect, useCallback } from 'react';
import { api, getApiBaseUrl, uploadFile } from '../lib/api';
import { RichTextEditor } from './RichTextEditor';

interface GeneralValue {
  logoMediaId?: string | null;
}
interface AboutValue {
  title?: string;
  subtitle?: string;
  content?: string;
}
interface FooterValue {
  tagline?: string;
  copyright?: string;
}
interface SocialValue {
  facebook?: string;
  facebookVisible?: boolean;
  instagram?: string;
  instagramVisible?: boolean;
  twitter?: string;
  twitterVisible?: boolean;
  youtube?: string;
  youtubeVisible?: boolean;
}

interface DeliveryValue {
  deliveryChargesCents?: number;
}

interface BankingValue {
  bankName?: string;
  accountTitle?: string;
  accountNumber?: string;
  iban?: string;
  instructions?: string;
}

interface SeoValue {
  siteTitle?: string;
  defaultDescription?: string;
  siteUrl?: string;
  ogImageDefault?: string;
  twitterHandle?: string;
  googleSiteVerification?: string;
}

interface MarketingValue {
  metaPixelId?: string;
  googleAnalyticsId?: string;
  googleTagManagerId?: string;
  enabled?: boolean;
}

interface PublicSettings {
  logoPath: string | null;
  about: AboutValue;
  footer: FooterValue;
  social: SocialValue;
  deliveryChargesCents?: number;
  banking?: BankingValue;
}

type SettingsMap = Record<string, Record<string, unknown>>;

function logoFullUrl(logoPath: string | null): string {
  if (!logoPath) return '';
  const base = getApiBaseUrl().replace(/\/$/, '');
  return logoPath.startsWith('http') ? logoPath : `${base}/media/file/${logoPath}`;
}

export function SettingsManager() {
  const [settings, setSettings] = useState<SettingsMap | null>(null);
  const [publicSettings, setPublicSettings] = useState<PublicSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [general, setGeneral] = useState<GeneralValue>({});
  const [about, setAbout] = useState<AboutValue>({});
  const [footer, setFooter] = useState<FooterValue>({});
  const [social, setSocial] = useState<SocialValue>({});
  const [freeDelivery, setFreeDelivery] = useState(true);
  const [deliveryChargesPkr, setDeliveryChargesPkr] = useState('');
  const [banking, setBanking] = useState<BankingValue>({});
  const [seo, setSeo] = useState<SeoValue>({});
  const [marketing, setMarketing] = useState<MarketingValue>({});

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, pubRes] = await Promise.all([
        api.get<SettingsMap>('/settings'),
        api.get<PublicSettings>('/settings/public'),
      ]);
      const data = res.data ?? {};
      setSettings(data);
      setPublicSettings(pubRes.data ?? null);
      setGeneral((data['general'] as GeneralValue) ?? {});
      setAbout((data['about'] as AboutValue) ?? {});
      setFooter((data['footer'] as FooterValue) ?? {});
      setSocial((data['social'] as SocialValue) ?? {});
      const delivery = data['delivery'] as DeliveryValue | undefined;
      const cents = delivery?.deliveryChargesCents ?? 0;
      setFreeDelivery(cents === 0);
      setDeliveryChargesPkr(cents === 0 ? '' : (cents / 100).toString());
      setBanking((data['banking'] as BankingValue) ?? {});
      setSeo((data['seo'] as SeoValue) ?? {});
      setMarketing((data['marketing'] as MarketingValue) ?? {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
      setSettings(null);
      setPublicSettings(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const saveKey = async (key: string, value: Record<string, unknown>) => {
    setSaving(key);
    setMessage(null);
    try {
      await api.put('/settings', { key, value });
      setMessage('Saved.');
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(null);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const { id } = await uploadFile(file);
      const next = { ...general, logoMediaId: id };
      setGeneral(next);
      await saveKey('general', next);
      fetchSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    }
    e.target.value = '';
  };

  const handleRemoveLogo = async () => {
    const next = { ...general, logoMediaId: null };
    setGeneral(next);
    await saveKey('general', next);
    fetchSettings();
  };

  const handleSaveAbout = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveKey('about', about);
  };

  const handleSaveFooter = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveKey('footer', footer);
  };

  const handleSaveSocial = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveKey('social', social);
  };

  const handleSaveDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    const cents = freeDelivery ? 0 : Math.round(parseFloat(deliveryChargesPkr || '0') * 100);
    if (!freeDelivery && (Number.isNaN(cents) || cents < 0)) {
      setError('Enter a valid delivery charge (PKR).');
      return;
    }
    setError(null);
    await saveKey('delivery', { deliveryChargesCents: freeDelivery ? 0 : cents });
    fetchSettings();
  };

  const handleSaveBanking = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveKey('banking', {
      bankName: banking.bankName?.trim() ?? '',
      accountTitle: banking.accountTitle?.trim() ?? '',
      accountNumber: banking.accountNumber?.trim() ?? '',
      iban: banking.iban?.trim() ?? '',
      instructions: banking.instructions?.trim() ?? '',
    });
    fetchSettings();
  };

  const handleSaveSeo = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveKey('seo', {
      siteTitle: seo.siteTitle?.trim() ?? '',
      defaultDescription: seo.defaultDescription?.trim() ?? '',
      siteUrl: (seo.siteUrl?.trim() ?? '').replace(/\/+$/, ''),
      ogImageDefault: seo.ogImageDefault?.trim() ?? '',
      twitterHandle: (seo.twitterHandle?.trim() ?? '').replace(/^@/, ''),
      googleSiteVerification: seo.googleSiteVerification?.trim() ?? '',
    });
    fetchSettings();
  };

  const handleSaveMarketing = async (e: React.FormEvent) => {
    e.preventDefault();
    const gtmRaw = (marketing.googleTagManagerId?.trim() ?? '').toUpperCase().replace(/^GTM-?/, '');
    await saveKey('marketing', {
      metaPixelId: marketing.metaPixelId?.trim() ?? '',
      googleAnalyticsId: marketing.googleAnalyticsId?.trim() ?? '',
      googleTagManagerId: gtmRaw ? `GTM-${gtmRaw}` : '',
      enabled: marketing.enabled !== false,
    });
    fetchSettings();
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 dark:border-slate-700 dark:bg-slate-800">
        <p className="text-slate-500 dark:text-slate-400">Loading settings…</p>
      </div>
    );
  }

  const logoUrl = publicSettings?.logoPath ? logoFullUrl(publicSettings.logoPath) : '';

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200">
          {message}
        </div>
      )}

      {/* General: Logo */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Logo</h2>
        <div className="flex flex-wrap items-start gap-4">
          {logoUrl && (
            <div className="flex flex-col items-start gap-2">
              <img src={logoUrl} alt="Site logo" className="h-16 object-contain" />
              <button
                type="button"
                onClick={handleRemoveLogo}
                disabled={saving === 'general'}
                className="text-sm text-slate-600 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
              >
                Remove logo
              </button>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Upload new logo
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleLogoUpload}
              disabled={saving === 'general'}
              className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-slate-700 dark:file:bg-slate-700 dark:file:text-slate-200"
            />
          </div>
        </div>
      </section>

      {/* Delivery */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Delivery charges</h2>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Set delivery charges applied at checkout. Enable free delivery to charge nothing. This applies globally on the storefront.
        </p>
        <form onSubmit={handleSaveDelivery} className="space-y-4">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={freeDelivery}
              onChange={(e) => {
                const checked = e.target.checked;
                setFreeDelivery(checked);
                if (!checked && !deliveryChargesPkr) setDeliveryChargesPkr('2.99');
              }}
              className="h-4 w-4 rounded border-slate-300 text-slate-600 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800"
            />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Free delivery</span>
          </label>
          {!freeDelivery && (
            <div>
              <label htmlFor="delivery-charges" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Delivery charges (PKR)
              </label>
              <input
                id="delivery-charges"
                type="number"
                min={0}
                step={1}
                value={deliveryChargesPkr}
                onChange={(e) => setDeliveryChargesPkr(e.target.value)}
                placeholder="e.g. 299"
                className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          )}
          <button
            type="submit"
            disabled={saving === 'delivery'}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-700 dark:hover:bg-slate-600"
          >
            {saving === 'delivery' ? 'Saving…' : 'Save delivery'}
          </button>
        </form>
      </section>

      {/* Banking (checkout) */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Banking details (checkout)</h2>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Shown to customers when they choose Bank Deposit at checkout. Leave blank to hide a field.
        </p>
        <form onSubmit={handleSaveBanking} className="space-y-4">
          <div>
            <label htmlFor="bank-name" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Bank name
            </label>
            <input
              id="bank-name"
              type="text"
              value={banking.bankName ?? ''}
              onChange={(e) => setBanking((b) => ({ ...b, bankName: e.target.value }))}
              placeholder="e.g. Adab Commerce Bank"
              className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          <div>
            <label htmlFor="bank-account-title" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Account title
            </label>
            <input
              id="bank-account-title"
              type="text"
              value={banking.accountTitle ?? ''}
              onChange={(e) => setBanking((b) => ({ ...b, accountTitle: e.target.value }))}
              placeholder="e.g. Adab Clothing (Pvt) Ltd"
              className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          <div>
            <label htmlFor="bank-account-number" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Account number
            </label>
            <input
              id="bank-account-number"
              type="text"
              value={banking.accountNumber ?? ''}
              onChange={(e) => setBanking((b) => ({ ...b, accountNumber: e.target.value }))}
              placeholder="e.g. 01234567890"
              className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          <div>
            <label htmlFor="bank-iban" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              IBAN
            </label>
            <input
              id="bank-iban"
              type="text"
              value={banking.iban ?? ''}
              onChange={(e) => setBanking((b) => ({ ...b, iban: e.target.value }))}
              placeholder="e.g. PK00ADAB00000000001234567890"
              className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          <div>
            <label htmlFor="bank-instructions" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Instructions (optional)
            </label>
            <textarea
              id="bank-instructions"
              rows={2}
              value={banking.instructions ?? ''}
              onChange={(e) => setBanking((b) => ({ ...b, instructions: e.target.value }))}
              placeholder="e.g. After transferring, upload a screenshot of your payment as proof."
              className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          <button
            type="submit"
            disabled={saving === 'banking'}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-700 dark:hover:bg-slate-600"
          >
            {saving === 'banking' ? 'Saving…' : 'Save banking details'}
          </button>
        </form>
      </section>

      {/* About */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">About page</h2>
        <form onSubmit={handleSaveAbout} className="space-y-4">
          <div>
            <label htmlFor="about-title" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Title
            </label>
            <input
              id="about-title"
              type="text"
              value={about.title ?? ''}
              onChange={(e) => setAbout((a) => ({ ...a, title: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          <div>
            <label htmlFor="about-subtitle" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Subtitle
            </label>
            <input
              id="about-subtitle"
              type="text"
              value={about.subtitle ?? ''}
              onChange={(e) => setAbout((a) => ({ ...a, subtitle: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          <div>
            <label htmlFor="about-content" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Content
            </label>
            <RichTextEditor
              value={about.content ?? ''}
              onChange={(content) => setAbout((a) => ({ ...a, content }))}
              placeholder="Write the about page content…"
              minHeight="14rem"
              className="mt-1"
            />
          </div>
          <button
            type="submit"
            disabled={saving === 'about'}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-700 dark:hover:bg-slate-600"
          >
            {saving === 'about' ? 'Saving…' : 'Save about'}
          </button>
        </form>
      </section>

      {/* Footer */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Footer</h2>
        <form onSubmit={handleSaveFooter} className="space-y-4">
          <div>
            <label htmlFor="footer-tagline" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Tagline
            </label>
            <input
              id="footer-tagline"
              type="text"
              value={footer.tagline ?? ''}
              onChange={(e) => setFooter((f) => ({ ...f, tagline: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          <div>
            <label htmlFor="footer-copyright" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Copyright text
            </label>
            <input
              id="footer-copyright"
              type="text"
              value={footer.copyright ?? ''}
              onChange={(e) => setFooter((f) => ({ ...f, copyright: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          <button
            type="submit"
            disabled={saving === 'footer'}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-700 dark:hover:bg-slate-600"
          >
            {saving === 'footer' ? 'Saving…' : 'Save footer'}
          </button>
        </form>
      </section>

      {/* Social */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Social media links</h2>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Enter URLs and check “Show on website” to display each link in the footer. Uncheck to hide a link without removing the URL.
        </p>
        <form onSubmit={handleSaveSocial} className="space-y-4">
          {(['facebook', 'instagram', 'twitter', 'youtube'] as const).map((platform) => {
            const visibleKey = `${platform}Visible` as keyof SocialValue;
            const visible = social[visibleKey] !== false;
            return (
              <div key={platform} className="rounded-lg border border-slate-200 p-4 dark:border-slate-600">
                <label
                  htmlFor={`social-${platform}`}
                  className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300 capitalize"
                >
                  {platform}
                </label>
                <input
                  id={`social-${platform}`}
                  type="url"
                  placeholder={`https://${platform}.com/...`}
                  value={social[platform] ?? ''}
                  onChange={(e) => setSocial((s) => ({ ...s, [platform]: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
                <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <input
                    type="checkbox"
                    checked={visible}
                    onChange={(e) =>
                      setSocial((s) => ({ ...s, [visibleKey]: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-slate-600 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800"
                  />
                  Show on website
                </label>
              </div>
            );
          })}
          <button
            type="submit"
            disabled={saving === 'social'}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-700 dark:hover:bg-slate-600"
          >
            {saving === 'social' ? 'Saving…' : 'Save social links'}
          </button>
        </form>
      </section>

      {/* SEO */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">SEO & meta tags</h2>
        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-600 dark:bg-slate-800/50">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            <strong>What this does:</strong> These settings control how your store appears in Google search results and when someone shares a link on Facebook, Twitter, or WhatsApp. Search engines and social apps read this information to show titles, descriptions, and images.
          </p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            <strong>Important:</strong> After you save changes here, your technical team must rebuild and redeploy the main website for changes to go live. Changes do not appear instantly.
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
            See <a href="/admin/docs/seo-marketing" className="underline hover:no-underline">Documentation → SEO & Marketing</a> for a step-by-step guide.
          </p>
        </div>
        <form onSubmit={handleSaveSeo} className="space-y-4">
          <div>
            <label htmlFor="seo-site-title" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Site title (brand name)
            </label>
            <input
              id="seo-site-title"
              type="text"
              value={seo.siteTitle ?? ''}
              onChange={(e) => setSeo((s) => ({ ...s, siteTitle: e.target.value }))}
              placeholder="e.g. Aien"
              className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Your brand or store name. Shown in browser tabs and search results.</p>
          </div>
          <div>
            <label htmlFor="seo-default-description" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Default meta description
            </label>
            <textarea
              id="seo-default-description"
              rows={2}
              value={seo.defaultDescription ?? ''}
              onChange={(e) => setSeo((s) => ({ ...s, defaultDescription: e.target.value }))}
              placeholder="e.g. Cultural-art streetwear. Poetry on fabric. Pakistan."
              className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">A short summary of your store (1–2 sentences). Shown under the title in Google and when links are shared. Keep it under 160 characters for best display.</p>
          </div>
          <div>
            <label htmlFor="seo-site-url" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Site URL
            </label>
            <input
              id="seo-site-url"
              type="url"
              value={seo.siteUrl ?? ''}
              onChange={(e) => setSeo((s) => ({ ...s, siteUrl: e.target.value }))}
              placeholder="https://aien.com"
              className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Your live website address, e.g. https://yoursite.com — no slash at the end. Used for proper links in search and social.</p>
          </div>
          <div>
            <label htmlFor="seo-og-image" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Default share image URL
            </label>
            <input
              id="seo-og-image"
              type="url"
              value={seo.ogImageDefault ?? ''}
              onChange={(e) => setSeo((s) => ({ ...s, ogImageDefault: e.target.value }))}
              placeholder="https://aien.com/og-image.jpg"
              className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Image shown when someone shares your site on Facebook, WhatsApp, Twitter, etc. Use a full URL (e.g. https://yoursite.com/images/og.jpg). Recommended size: 1200×630 px.</p>
          </div>
          <div>
            <label htmlFor="seo-twitter" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Twitter handle (optional)
            </label>
            <input
              id="seo-twitter"
              type="text"
              value={seo.twitterHandle ?? ''}
              onChange={(e) => setSeo((s) => ({ ...s, twitterHandle: e.target.value.replace(/^@/, '') }))}
              placeholder="aien"
              className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Your Twitter/X username without the @ symbol. Improves how links appear when shared on Twitter.</p>
          </div>
          <div>
            <label htmlFor="seo-google-verification" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Google Search Console verification (optional)
            </label>
            <input
              id="seo-google-verification"
              type="text"
              value={seo.googleSiteVerification ?? ''}
              onChange={(e) => setSeo((s) => ({ ...s, googleSiteVerification: e.target.value }))}
              placeholder="Meta tag content value"
              className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">If you use Google Search Console, paste only the content value from the meta tag (the long code between the quotes). Leave blank if you don&apos;t use it.</p>
          </div>
          <button
            type="submit"
            disabled={saving === 'seo'}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-700 dark:hover:bg-slate-600"
          >
            {saving === 'seo' ? 'Saving…' : 'Save SEO'}
          </button>
        </form>
      </section>

      {/* Marketing */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Marketing & tracking pixels</h2>
        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-600 dark:bg-slate-800/50">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            <strong>What this does:</strong> Connect Facebook ads (Meta Pixel), Google Analytics, or Google Tag Manager to track visitors and measure ad performance. These codes help you see how people find your store and what they do on it.
          </p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            <strong>Tip:</strong> If you use Google Tag Manager, you can add Meta Pixel and Google Analytics inside GTM — then you only need to enter your GTM container ID here. Otherwise, add each ID separately.
          </p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            <strong>Important:</strong> Save here, then ask your technical team to rebuild and redeploy the main website. Uncheck &quot;Enable tracking&quot; to turn off all pixels without removing the IDs.
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
            See <a href="/admin/docs/seo-marketing" className="underline hover:no-underline">Documentation → SEO & Marketing</a> for a step-by-step guide.
          </p>
        </div>
        <form onSubmit={handleSaveMarketing} className="space-y-4">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={marketing.enabled !== false}
              onChange={(e) => setMarketing((m) => ({ ...m, enabled: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-slate-600 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800"
            />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Enable tracking pixels</span>
          </label>
          <p className="text-xs text-slate-500 dark:text-slate-400">Uncheck to turn off all tracking. Your IDs stay saved but won&apos;t run on the site.</p>
          <div>
            <label htmlFor="marketing-pixel" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Meta (Facebook) Pixel ID
            </label>
            <input
              id="marketing-pixel"
              type="text"
              value={marketing.metaPixelId ?? ''}
              onChange={(e) => setMarketing((m) => ({ ...m, metaPixelId: e.target.value }))}
              placeholder="e.g. 1234567890123456"
              className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Found in Events Manager → Data Sources → Your Pixel → Pixel ID. Only needed if you&apos;re not using GTM for Facebook ads.</p>
          </div>
          <div>
            <label htmlFor="marketing-ga" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Google Analytics ID
            </label>
            <input
              id="marketing-ga"
              type="text"
              value={marketing.googleAnalyticsId ?? ''}
              onChange={(e) => setMarketing((m) => ({ ...m, googleAnalyticsId: e.target.value }))}
              placeholder="e.g. G-XXXXXXXXXX"
              className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Starts with G-. Found in GA4 → Admin → Data Streams → Your web stream. Only needed if you&apos;re not using GTM.</p>
          </div>
          <div>
            <label htmlFor="marketing-gtm" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Google Tag Manager container ID
            </label>
            <input
              id="marketing-gtm"
              type="text"
              value={marketing.googleTagManagerId ?? ''}
              onChange={(e) => setMarketing((m) => ({ ...m, googleTagManagerId: e.target.value }))}
              placeholder="e.g. GTM-XXXXXXX"
              className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Starts with GTM-. One container can manage Facebook Pixel, Google Analytics, and more — add those inside GTM. If you use GTM, you can leave Meta Pixel and GA fields above empty.</p>
          </div>
          <button
            type="submit"
            disabled={saving === 'marketing'}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-700 dark:hover:bg-slate-600"
          >
            {saving === 'marketing' ? 'Saving…' : 'Save marketing'}
          </button>
        </form>
      </section>
    </div>
  );
}
