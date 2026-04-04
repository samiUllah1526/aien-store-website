import { useState, useEffect, useCallback, useRef } from 'react';
import { Controller, useFieldArray } from 'react-hook-form';
import { api, getApiBaseUrl, uploadFile } from '../lib/api';
import { uploadMedia } from '../lib/media-upload';
import { toastSuccess, toastError } from '../lib/toast';
import { resolveAdminImageUrl } from '../lib/resolveImageUrl';
import { AdminImagePreviewModal } from './AdminImagePreviewModal';
import { RichTextEditor } from './RichTextEditor';
import { useZodForm } from '../lib/forms/useZodForm';
import {
  aboutSettingsSchema,
  announcementSettingsSchema,
  bankingSettingsSchema,
  deliverySettingsSchema,
  footerSettingsSchema,
  heroSettingsSchema,
  marketingSettingsSchema,
  seoSettingsSchema,
  socialSettingsSchema,
} from '../lib/validation/settings';

interface GeneralValue {
  logoMediaId?: string | null;
}
interface AboutValue {
  title?: string;
  subtitle?: string;
  content?: string;
  bannerImageUrl?: string;
}
interface FooterValue {
  tagline?: string;
  copyright?: string;
  email?: string;
  phone?: string;
  hours?: string;
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

interface AnnouncementItem {
  text: string;
  visible?: boolean;
}

interface AnnouncementValue {
  items?: AnnouncementItem[];
}

interface HeroSlideValue {
  src: string;
  alt?: string;
}

interface HeroValue {
  slides?: HeroSlideValue[];
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
  const [uploadingHeroSlideIndex, setUploadingHeroSlideIndex] = useState<number | null>(null);
  const [uploadingAboutBanner, setUploadingAboutBanner] = useState(false);
  const [aboutBannerDragOver, setAboutBannerDragOver] = useState(false);
  const [aboutBannerPreviewOpen, setAboutBannerPreviewOpen] = useState(false);
  const aboutBannerFileInputRef = useRef<HTMLInputElement | null>(null);
  const heroFileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const [general, setGeneral] = useState<GeneralValue>({});
  const aboutForm = useZodForm({
    schema: aboutSettingsSchema,
    defaultValues: { title: '', subtitle: '', content: '', bannerImageUrl: '' },
  });
  const footerForm = useZodForm({ schema: footerSettingsSchema, defaultValues: { tagline: '', copyright: '', email: '', phone: '', hours: '' } });
  const socialForm = useZodForm({
    schema: socialSettingsSchema,
    defaultValues: {
      facebook: '',
      facebookVisible: true,
      instagram: '',
      instagramVisible: true,
      twitter: '',
      twitterVisible: true,
      youtube: '',
      youtubeVisible: true,
    },
  });
  const deliveryForm = useZodForm({ schema: deliverySettingsSchema, defaultValues: { freeDelivery: true, deliveryChargesPkr: '' } });
  const bankingForm = useZodForm({ schema: bankingSettingsSchema, defaultValues: { bankName: '', accountTitle: '', accountNumber: '', iban: '', instructions: '' } });
  const seoForm = useZodForm({ schema: seoSettingsSchema, defaultValues: { siteTitle: '', defaultDescription: '', siteUrl: '', ogImageDefault: '', twitterHandle: '', googleSiteVerification: '' } });
  const marketingForm = useZodForm({ schema: marketingSettingsSchema, defaultValues: { metaPixelId: '', googleAnalyticsId: '', googleTagManagerId: '', enabled: true } });
  const announcementForm = useZodForm({ schema: announcementSettingsSchema, defaultValues: { items: [] } });
  const heroForm = useZodForm({ schema: heroSettingsSchema, defaultValues: { slides: [] } });
  const announcementArray = useFieldArray({ control: announcementForm.control, name: 'items' });
  const heroArray = useFieldArray({ control: heroForm.control, name: 'slides' });

  type SettingsTab = 'general' | 'content' | 'footer-social' | 'commerce' | 'seo-marketing';
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, displayRes] = await Promise.all([
        api.get<SettingsMap>('/settings'),
        api.get<PublicSettings>('/settings/display'),
      ]);
      const data = res.data ?? {};
      setSettings(data);
      setPublicSettings(displayRes.data ?? null);
      setGeneral((data['general'] as GeneralValue) ?? {});
      aboutForm.reset((data['about'] as AboutValue) ?? {});
      footerForm.reset((data['footer'] as FooterValue) ?? {});
      socialForm.reset((data['social'] as SocialValue) ?? {});
      const delivery = data['delivery'] as DeliveryValue | undefined;
      const cents = delivery?.deliveryChargesCents ?? 0;
      deliveryForm.reset({ freeDelivery: cents === 0, deliveryChargesPkr: cents === 0 ? '' : (cents / 100).toString() });
      bankingForm.reset((data['banking'] as BankingValue) ?? {});
      seoForm.reset((data['seo'] as SeoValue) ?? {});
      marketingForm.reset((data['marketing'] as MarketingValue) ?? { enabled: true });
      announcementForm.reset((data['announcement'] as AnnouncementValue) ?? { items: [] });
      heroForm.reset((data['hero'] as HeroValue) ?? { slides: [] });
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

  const saveKey = async (key: string, value: object) => {
    setSaving(key);
    setMessage(null);
    try {
      await api.put('/settings', { key, value });
      setMessage('Saved.');
      toastSuccess('Saved.');
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
      let id: string;
      try {
        const result = await uploadMedia(file, 'products');
        id = result.id;
      } catch {
        const res = await uploadFile(file);
        id = res.id;
      }
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

  const handleSaveAbout = aboutForm.handleSubmit(async (values) => saveKey('about', values));

  const uploadAboutBannerFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file (JPEG, PNG, WebP, or GIF).');
      return;
    }
    setUploadingAboutBanner(true);
    setError(null);
    try {
      let src: string;
      try {
        const result = await uploadMedia(file, 'products');
        src = result.deliveryUrl;
      } catch {
        const base = getApiBaseUrl().replace(/\/$/, '');
        const res = await uploadFile(file);
        src = `${base}/media/file/${res.id}`;
      }
      if (src) {
        aboutForm.setValue('bannerImageUrl', src, { shouldDirty: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadingAboutBanner(false);
    }
  };

  const handleAboutBannerFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) void uploadAboutBannerFile(file);
  };

  const handleAboutBannerDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setAboutBannerDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void uploadAboutBannerFile(file);
  };

  const handleSaveFooter = footerForm.handleSubmit(async (values) => saveKey('footer', values));

  const handleSaveAnnouncement = announcementForm.handleSubmit(async (values) =>
    saveKey('announcement', { items: values.items ?? [] }),
  );

  const handleSaveHero = heroForm.handleSubmit(async (values) => {
    const slides = (values.slides ?? []).filter((s) => (s.src ?? '').trim() !== '');
    await saveKey('hero', { slides });
    heroForm.setValue('slides', slides);
  });

  const handleHeroImageUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const fields = heroArray.fields;
    if (index < 0 || index >= fields.length) return;
    setUploadingHeroSlideIndex(index);
    setError(null);
    try {
      let deliveryUrl: string;
      try {
        const result = await uploadMedia(file, 'products');
        deliveryUrl = result.deliveryUrl;
      } catch {
        const base = getApiBaseUrl().replace(/\/$/, '');
        const res = await uploadFile(file);
        deliveryUrl = `${base}/media/file/${res.id}`;
      }
      heroForm.setValue(`slides.${index}.src`, deliveryUrl, { shouldValidate: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setError(msg);
      toastError(msg);
    } finally {
      setUploadingHeroSlideIndex(null);
    }
  };

  const triggerHeroFileInput = (index: number) => {
    heroFileInputRefs.current[index]?.click();
  };

  const handleSaveSocial = socialForm.handleSubmit(async (values) => saveKey('social', values));

  const handleSaveDelivery = deliveryForm.handleSubmit(async (values) => {
    const cents = values.freeDelivery ? 0 : Math.round(parseFloat(values.deliveryChargesPkr || '0') * 100);
    await saveKey('delivery', { deliveryChargesCents: values.freeDelivery ? 0 : cents });
    fetchSettings();
  });

  const handleSaveBanking = bankingForm.handleSubmit(async (values) => {
    await saveKey('banking', {
      bankName: values.bankName?.trim() ?? '',
      accountTitle: values.accountTitle?.trim() ?? '',
      accountNumber: values.accountNumber?.trim() ?? '',
      iban: values.iban?.trim() ?? '',
      instructions: values.instructions?.trim() ?? '',
    });
    fetchSettings();
  });

  const handleSaveSeo = seoForm.handleSubmit(async (values) => {
    await saveKey('seo', {
      siteTitle: values.siteTitle?.trim() ?? '',
      defaultDescription: values.defaultDescription?.trim() ?? '',
      siteUrl: (values.siteUrl?.trim() ?? '').replace(/\/+$/, ''),
      ogImageDefault: values.ogImageDefault?.trim() ?? '',
      twitterHandle: (values.twitterHandle?.trim() ?? '').replace(/^@/, ''),
      googleSiteVerification: values.googleSiteVerification?.trim() ?? '',
    });
    fetchSettings();
  });

  const handleSaveMarketing = marketingForm.handleSubmit(async (values) => {
    const gtmRaw = (values.googleTagManagerId?.trim() ?? '').toUpperCase().replace(/^GTM-?/, '');
    await saveKey('marketing', {
      metaPixelId: values.metaPixelId?.trim() ?? '',
      googleAnalyticsId: values.googleAnalyticsId?.trim() ?? '',
      googleTagManagerId: gtmRaw ? `GTM-${gtmRaw}` : '',
      enabled: values.enabled !== false,
    });
    fetchSettings();
  });

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 dark:border-slate-700 dark:bg-slate-800">
        <p className="text-slate-500 dark:text-slate-400">Loading settings…</p>
        <p className="mt-2 text-sm text-slate-400 dark:text-slate-500">
          If this takes more than a few seconds, ensure the backend is running and PUBLIC_API_URL is correct.
        </p>
      </div>
    );
  }

  const logoUrl = publicSettings?.logoPath ? logoFullUrl(publicSettings.logoPath) : '';

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => {
              setError(null);
              fetchSettings();
            }}
            className="mt-2 rounded bg-red-100 px-3 py-1 text-sm font-medium text-red-800 hover:bg-red-200 dark:bg-red-800/30 dark:text-red-200 dark:hover:bg-red-800/50"
          >
            Retry
          </button>
        </div>
      )}
      {message && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200">
          {message}
        </div>
      )}

      <nav className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800/50" aria-label="Settings sections">
        {[
          { id: 'general' as const, label: 'General' },
          { id: 'content' as const, label: 'Content' },
          { id: 'footer-social' as const, label: 'Footer & Social' },
          { id: 'commerce' as const, label: 'Commerce' },
          { id: 'seo-marketing' as const, label: 'SEO & Marketing' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-white text-slate-900 shadow dark:bg-slate-700 dark:text-white' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'}`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="space-y-8">
      {activeTab === 'general' && (
      <>
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
      </> )}

      {activeTab === 'commerce' && (
      <>
      {/* Delivery */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Delivery charges</h2>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Set delivery charges applied at checkout. Enable free delivery to charge nothing. This applies globally on the storefront.
        </p>
        <form onSubmit={handleSaveDelivery} className="space-y-4">
          {deliveryForm.formState.errors.deliveryChargesPkr?.message && (
            <p className="text-sm text-red-600 dark:text-red-400">{deliveryForm.formState.errors.deliveryChargesPkr.message}</p>
          )}
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={deliveryForm.watch('freeDelivery')}
              onChange={(e) => {
                const checked = e.target.checked;
                deliveryForm.setValue('freeDelivery', checked, { shouldValidate: true });
                if (!checked && !deliveryForm.watch('deliveryChargesPkr')) {
                  deliveryForm.setValue('deliveryChargesPkr', '2.99', { shouldValidate: true });
                }
              }}
              className="h-4 w-4 rounded border-slate-300 text-slate-600 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800"
            />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Free delivery</span>
          </label>
          {!deliveryForm.watch('freeDelivery') && (
            <div>
              <label htmlFor="delivery-charges" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Delivery charges (PKR)
              </label>
              <input
                id="delivery-charges"
                type="number"
                min={0}
                step={1}
                {...deliveryForm.register('deliveryChargesPkr')}
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
              {...bankingForm.register('bankName')}
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
              {...bankingForm.register('accountTitle')}
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
              {...bankingForm.register('accountNumber')}
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
              {...bankingForm.register('iban')}
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
              {...bankingForm.register('instructions')}
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
      </> )}

      {activeTab === 'content' && (
      <>
      {/* About */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">About page</h2>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Optional full-bleed banner at the top of /about (same style as shop category banners). Upload or paste an image URL, then save.
        </p>
        <form onSubmit={handleSaveAbout} className="space-y-4">
          <div>
            <label htmlFor="about-title" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Title
            </label>
            <input
              id="about-title"
              type="text"
              {...aboutForm.register('title')}
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
              {...aboutForm.register('subtitle')}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          <div>
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Banner image (optional)</span>
            <input
              ref={aboutBannerFileInputRef}
              id="about-banner-file"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              disabled={uploadingAboutBanner}
              onChange={handleAboutBannerFileInputChange}
            />
            {(aboutForm.watch('bannerImageUrl') ?? '').trim() ? (
              <button
                type="button"
                className="mb-3 w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-0 text-left dark:border-slate-600 dark:bg-slate-900/40 cursor-zoom-in"
                onClick={() => setAboutBannerPreviewOpen(true)}
                aria-label="View banner full size"
              >
                <img
                  src={resolveAdminImageUrl(aboutForm.watch('bannerImageUrl'))}
                  alt=""
                  className="max-h-40 w-full object-contain"
                />
              </button>
            ) : (
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (!uploadingAboutBanner) aboutBannerFileInputRef.current?.click();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (!uploadingAboutBanner) aboutBannerFileInputRef.current?.click();
                  }
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setAboutBannerDragOver(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setAboutBannerDragOver(false);
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.dataTransfer.dropEffect = 'copy';
                }}
                onDrop={handleAboutBannerDrop}
                className={`mb-3 flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors ${
                  aboutBannerDragOver
                    ? 'border-slate-500 bg-slate-100 dark:border-slate-400 dark:bg-slate-700/50'
                    : 'border-slate-300 bg-slate-50/80 hover:border-slate-400 hover:bg-slate-100/80 dark:border-slate-600 dark:bg-slate-800/40 dark:hover:border-slate-500 dark:hover:bg-slate-800/70'
                } ${uploadingAboutBanner ? 'pointer-events-none opacity-60' : ''}`}
              >
                {uploadingAboutBanner ? (
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Uploading…</span>
                ) : (
                  <>
                    <svg
                      className="h-10 w-10 text-slate-400 dark:text-slate-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Drag and drop an image here</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">or click to browse — JPEG, PNG, WebP, GIF</p>
                  </>
                )}
              </div>
            )}
            <label htmlFor="about-banner-url" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Banner image URL (optional)
            </label>
            <input
              id="about-banner-url"
              type="url"
              {...aboutForm.register('bannerImageUrl')}
              placeholder="https://…"
              className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
            {(aboutForm.watch('bannerImageUrl') ?? '').trim() ? (
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={uploadingAboutBanner}
                  onClick={() => aboutBannerFileInputRef.current?.click()}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  {uploadingAboutBanner ? 'Uploading…' : 'Replace image'}
                </button>
                <button
                  type="button"
                  className="text-sm font-medium text-red-600 hover:text-red-800 dark:text-red-400"
                  onClick={() => aboutForm.setValue('bannerImageUrl', '', { shouldDirty: true })}
                >
                  Remove banner
                </button>
              </div>
            ) : null}
            <AdminImagePreviewModal
              open={aboutBannerPreviewOpen}
              onClose={() => setAboutBannerPreviewOpen(false)}
              images={
                (aboutForm.watch('bannerImageUrl') ?? '').trim()
                  ? [resolveAdminImageUrl(aboutForm.watch('bannerImageUrl') ?? '')]
                  : []
              }
              initialIndex={0}
            />
          </div>
          <div>
            <label htmlFor="about-content" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Content
            </label>
            <Controller
              control={aboutForm.control}
              name="content"
              render={({ field }) => (
                <RichTextEditor
                  value={field.value ?? ''}
                  onChange={(content) => field.onChange(content)}
                  placeholder="Write the about page content…"
                  minHeight="14rem"
                  className="mt-1"
                />
              )}
            />
          </div>
          <button
            type="submit"
            disabled={saving === 'about' || uploadingAboutBanner}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-700 dark:hover:bg-slate-600"
          >
            {saving === 'about' ? 'Saving…' : uploadingAboutBanner ? 'Uploading…' : 'Save about'}
          </button>
        </form>
      </section>

      {/* Announcement bar */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Announcement bar</h2>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Add one or more messages to show in the strip above the header. Uncheck “Show on website” to hide a message without removing it. They will rotate on the website when visible.
        </p>
        <form onSubmit={handleSaveAnnouncement} className="space-y-4">
          {announcementArray.fields.map((item, index) => (
            <div key={item.id} className="rounded-lg border border-slate-200 p-4 dark:border-slate-600">
              <div className="flex gap-2">
                <input
                  type="text"
                  {...announcementForm.register(`items.${index}.text`)}
                  placeholder="e.g. FREE DELIVERY ON ORDERS PKR 2000 & ABOVE"
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
                />
                <button
                  type="button"
                  onClick={() => announcementArray.remove(index)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700"
                  aria-label="Remove announcement"
                >
                  Remove
                </button>
              </div>
              <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <input
                  type="checkbox"
                  {...announcementForm.register(`items.${index}.visible`)}
                  className="h-4 w-4 rounded border-slate-300 text-slate-600 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800"
                />
                Show on website
              </label>
            </div>
          ))}
          <button
            type="button"
            onClick={() => announcementArray.append({ text: '', visible: true })}
            className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700/50"
          >
            + Add announcement
          </button>
          <button
            type="submit"
            disabled={saving === 'announcement'}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-700 dark:hover:bg-slate-600"
          >
            {saving === 'announcement' ? 'Saving…' : 'Save announcement bar'}
          </button>
        </form>
      </section>

      {/* Hero carousel */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Hero carousel (home page)</h2>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Add image URLs for the hero carousel on the home page. Order is preserved. Leave URL empty to remove when saving.
        </p>
        <form onSubmit={handleSaveHero} className="space-y-4">
          {heroArray.fields.map((slide, index) => (
            <div key={slide.id} className="rounded-lg border border-slate-200 p-4 dark:border-slate-600">
              <div className="flex gap-2 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <label htmlFor={`hero-src-${index}`} className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Image URL
                  </label>
                  <input
                    id={`hero-src-${index}`}
                    type="url"
                    {...heroForm.register(`slides.${index}.src`)}
                    placeholder="https://example.com/image.jpg"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                  <div className="mt-2">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      aria-hidden
                      ref={(el) => {
                        heroFileInputRefs.current[index] = el;
                      }}
                      disabled={uploadingHeroSlideIndex !== null}
                      onChange={(e) => handleHeroImageUpload(index, e)}
                    />
                    <button
                      type="button"
                      onClick={(ev) => {
                        ev.preventDefault();
                        ev.stopPropagation();
                        triggerHeroFileInput(index);
                      }}
                      disabled={uploadingHeroSlideIndex !== null}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      {uploadingHeroSlideIndex === index ? 'Uploading…' : 'Upload image'}
                    </button>
                  </div>
                </div>
                <div className="flex-1 min-w-[120px]">
                  <label htmlFor={`hero-alt-${index}`} className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Alt text (optional)
                  </label>
                  <input
                    id={`hero-alt-${index}`}
                    type="text"
                    {...heroForm.register(`slides.${index}.alt`)}
                    placeholder="Description for accessibility"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => heroArray.remove(index)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700"
                    aria-label="Remove slide"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => heroArray.append({ src: '', alt: '' })}
            className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700/50"
          >
            + Add image
          </button>
          <button
            type="submit"
            disabled={saving === 'hero' || uploadingHeroSlideIndex !== null}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-700 dark:hover:bg-slate-600"
          >
            {saving === 'hero' ? 'Saving…' : uploadingHeroSlideIndex !== null ? 'Uploading…' : 'Save hero carousel'}
          </button>
        </form>
      </section>
      </> )}

      {activeTab === 'footer-social' && (
      <>
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
              {...footerForm.register('tagline')}
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
              {...footerForm.register('copyright')}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          <div>
            <label htmlFor="footer-email" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Support email
            </label>
            <input
              id="footer-email"
              type="email"
              {...footerForm.register('email')}
              placeholder="contact@example.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
            />
          </div>
          <div>
            <label htmlFor="footer-phone" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Support phone
            </label>
            <input
              id="footer-phone"
              type="text"
              {...footerForm.register('phone')}
              placeholder="000-0000000"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
            />
          </div>
          <div>
            <label htmlFor="footer-hours" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Support hours
            </label>
            <input
              id="footer-hours"
              type="text"
              {...footerForm.register('hours')}
              placeholder="MON - SAT | 9am - 5pm"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
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
            const visible = socialForm.watch(visibleKey as any) !== false;
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
                  {...socialForm.register(platform)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
                <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <input
                    type="checkbox"
                    checked={visible}
                    onChange={(e) => socialForm.setValue(visibleKey as any, e.target.checked, { shouldValidate: true })}
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
      </> )}

      {activeTab === 'seo-marketing' && (
      <>
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
              {...seoForm.register('siteTitle')}
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
              {...seoForm.register('defaultDescription')}
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
              {...seoForm.register('siteUrl')}
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
              {...seoForm.register('ogImageDefault')}
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
              {...seoForm.register('twitterHandle')}
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
              {...seoForm.register('googleSiteVerification')}
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
              {...marketingForm.register('enabled')}
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
              {...marketingForm.register('metaPixelId')}
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
              {...marketingForm.register('googleAnalyticsId')}
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
              {...marketingForm.register('googleTagManagerId')}
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
      </> )}
      </div>
    </div>
  );
}
