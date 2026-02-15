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

interface PublicSettings {
  logoPath: string | null;
  about: AboutValue;
  footer: FooterValue;
  social: SocialValue;
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
    </div>
  );
}
