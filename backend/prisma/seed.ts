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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
