import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');
const adapter = new PrismaPg({ connectionString: url });
const prisma = new PrismaClient({ adapter });

const SALT_ROUNDS = 10;

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!';
const ADMIN_NAME = process.env.SEED_ADMIN_NAME ?? 'Admin';

const PERMISSION_NAMES = [
  'users:read',
  'users:write',
  'orders:read',
  'orders:write',
  'products:write',
  'categories:read',
  'categories:write',
  'settings:read',
  'settings:write',
  'emaillogs:read',
  'emaillogs:resend',
] as const;

async function main() {
  const permissions: { id: string; name: string }[] = [];
  for (const name of PERMISSION_NAMES) {
    const p = await prisma.permission.upsert({
      where: { name },
      create: { name },
      update: {},
    });
    permissions.push(p);
  }

  const adminRole = await prisma.role.upsert({
    where: { name: 'Admin' },
    create: { name: 'Admin' },
    update: {},
  });

  for (const perm of permissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id },
      },
      create: { roleId: adminRole.id, permissionId: perm.id },
      update: {},
    });
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, SALT_ROUNDS);
  const existing = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
  });

  if (existing) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: { userId: existing.id, roleId: adminRole.id },
      },
      create: { userId: existing.id, roleId: adminRole.id },
      update: {},
    });
    console.log('Seed: Admin user already exists, ensured Admin role. Email:', ADMIN_EMAIL);
  } else {
    const user = await prisma.user.create({
      data: {
        name: ADMIN_NAME,
        firstName: ADMIN_NAME,
        lastName: null,
        email: ADMIN_EMAIL,
        passwordHash,
        status: 'ACTIVE',
        roles: {
          create: [{ roleId: adminRole.id }],
        },
      },
    });
    console.log('Seed: Created admin user. Email:', ADMIN_EMAIL);
    console.log('Seed: Login at /admin/login with the above email and your SEED_ADMIN_PASSWORD (or default Admin123!).');
  }

  const exampleCategories = [
    { name: 'Shirts', slug: 'shirts', description: 'T-shirts, casual and formal shirts' },
    { name: 'Accessories', slug: 'accessories', description: 'Bags, caps, and accessories' },
    { name: 'Footwear', slug: 'footwear', description: 'Shoes and sandals' },
  ];
  for (const cat of exampleCategories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      create: cat,
      update: { name: cat.name, description: cat.description ?? undefined },
    });
  }
  console.log('Seed: Ensured 3 example categories (shirts, accessories, footwear).');

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
  ] as const;
  for (const { key, value } of defaultSettings) {
    await prisma.siteSetting.upsert({
      where: { key },
      create: { key, value: JSON.parse(JSON.stringify(value)) },
      update: {},
    });
  }
  console.log('Seed: Ensured default site settings (general, about, footer, social, delivery, banking).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
