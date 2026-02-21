/**
 * Restore default site settings. Use when settings were lost (e.g. after migration reset).
 * Overwrites existing values with defaults.
 *
 * Run: npm run db:restore-settings
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');
const adapter = new PrismaPg({ connectionString: url });
const prisma = new PrismaClient({ adapter });

const currentYear = new Date().getFullYear();

const defaultSettings = [
  { key: 'general', value: { logoMediaId: null } },
  {
    key: 'about',
    value: {
      title: 'Wear the words',
      subtitle: 'Where adab meets the street.',
      content:
        '<p>Adab is more than etiquette — it\'s the art of how we speak, how we listen, and how we carry ourselves. In Urdu literature, adab runs through every line of verse, every gathering at a mushaira, every moment when a poet picks up the pen. We wanted to bring that soul into what you wear.</p><p>Our pieces are inspired by classical Urdu poetry: the ghazal, the nazm, the couplets that have moved generations. Each design carries a verse — sometimes loud on the chest, sometimes tucked in like a secret. The words are in Nastaliq, in script that feels like breath on paper.</p><p>We\'re not a fashion label that uses Urdu as a trend. We\'re a label that starts from the verse. From the culture of mehfils and mushairas, from the weight of a single word. Streetwear that doesn\'t shout — it speaks.</p><p class="urdu-blockquote">الفاظ سے پہلے آداب سیکھو</p><p><em>Alfaaz se pehle adaab seekho — Before words, learn adab.</em></p><p>Thank you for wearing the words with us. For carrying a little bit of adab into your day.</p>',
    },
  },
  {
    key: 'footer',
    value: {
      tagline: 'Wear the words. Urdu poetry & adab on streetwear.',
      copyright: `© ${currentYear} Adab. All rights reserved.`,
    },
  },
  {
    key: 'social',
    value: { facebook: '', instagram: '', twitter: '', youtube: '' },
  },
  { key: 'delivery', value: { deliveryChargesCents: 0 } },
  {
    key: 'banking',
    value: {
      bankName: 'Adab Commerce Bank',
      accountTitle: 'Adab Clothing (Pvt) Ltd',
      accountNumber: '01234567890',
      iban: 'PK00ADAB00000000001234567890',
      instructions: 'After transferring, upload a screenshot of your payment as proof.',
    },
  },
  {
    key: 'seo',
    value: {
      siteTitle: 'Adab',
      defaultDescription: 'Urdu poetry & adab on streetwear. Wear the words.',
      siteUrl: '',
      ogImageDefault: '',
      twitterHandle: '',
      googleSiteVerification: '',
    },
  },
  {
    key: 'marketing',
    value: {
      metaPixelId: '',
      googleAnalyticsId: '',
      googleTagManagerId: '',
      enabled: false,
    },
  },
];

async function main() {
  for (const { key, value } of defaultSettings) {
    await prisma.siteSetting.upsert({
      where: { key },
      create: { key, value: value as object },
      update: { value: value as object },
    });
  }
  console.log('Restored default site settings (general, about, footer, social, delivery, banking, seo, marketing).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
