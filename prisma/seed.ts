/* eslint-disable no-console */
import { ContentStatus, ContentType, PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const BCRYPT_COST = 12;

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function upsertUser(opts: {
  email: string;
  name: string;
  password: string;
  role: Role;
}) {
  const passwordHash = await bcrypt.hash(opts.password, BCRYPT_COST);
  return prisma.user.upsert({
    where: { email: opts.email },
    update: { name: opts.name, role: opts.role },
    create: {
      email: opts.email,
      name: opts.name,
      passwordHash,
      role: opts.role,
    },
  });
}

async function upsertCategory(name: string, description?: string) {
  const slug = slugify(name);
  return prisma.category.upsert({
    where: { slug },
    update: { name, description: description ?? null },
    create: { slug, name, description: description ?? null },
  });
}

async function upsertTag(name: string) {
  const slug = slugify(name);
  return prisma.tag.upsert({
    where: { slug },
    update: { name },
    create: { slug, name },
  });
}

type SeedPost = {
  title: string;
  excerpt: string;
  body: string;
  status: ContentStatus;
  authorEmail: string;
  categories: string[];
  tags: string[];
  publishedAt?: Date | null;
  scheduledFor?: Date | null;
};

async function upsertPost(post: SeedPost) {
  const slug = slugify(post.title);
  const author = await prisma.user.findUniqueOrThrow({ where: { email: post.authorEmail } });

  const categoryIds = await Promise.all(
    post.categories.map(async (name) => {
      const c = await prisma.category.findUniqueOrThrow({ where: { slug: slugify(name) } });
      return c.id;
    }),
  );
  const tagIds = await Promise.all(
    post.tags.map(async (name) => {
      const t = await prisma.tag.findUniqueOrThrow({ where: { slug: slugify(name) } });
      return t.id;
    }),
  );

  const content = await prisma.content.upsert({
    where: { slug },
    update: {
      title: post.title,
      excerpt: post.excerpt,
      body: post.body,
      status: post.status,
      publishedAt: post.publishedAt ?? null,
      scheduledFor: post.scheduledFor ?? null,
    },
    create: {
      type: ContentType.POST,
      slug,
      title: post.title,
      excerpt: post.excerpt,
      body: post.body,
      status: post.status,
      publishedAt: post.publishedAt ?? null,
      scheduledFor: post.scheduledFor ?? null,
      authorId: author.id,
    },
  });

  // Reset taxonomy joins so seed is idempotent.
  await prisma.contentCategory.deleteMany({ where: { contentId: content.id } });
  await prisma.contentTag.deleteMany({ where: { contentId: content.id } });

  if (categoryIds.length > 0) {
    await prisma.contentCategory.createMany({
      data: categoryIds.map((categoryId) => ({ contentId: content.id, categoryId })),
      skipDuplicates: true,
    });
  }
  if (tagIds.length > 0) {
    await prisma.contentTag.createMany({
      data: tagIds.map((tagId) => ({ contentId: content.id, tagId })),
      skipDuplicates: true,
    });
  }

  return content;
}

async function upsertPage(opts: {
  slug: string;
  title: string;
  body: string;
  authorEmail: string;
  status?: ContentStatus;
}) {
  const author = await prisma.user.findUniqueOrThrow({ where: { email: opts.authorEmail } });
  const status = opts.status ?? ContentStatus.PUBLISHED;
  return prisma.content.upsert({
    where: { slug: opts.slug },
    update: {
      title: opts.title,
      body: opts.body,
      status,
      publishedAt: status === ContentStatus.PUBLISHED ? new Date() : null,
    },
    create: {
      type: ContentType.PAGE,
      slug: opts.slug,
      title: opts.title,
      body: opts.body,
      status,
      publishedAt: status === ContentStatus.PUBLISHED ? new Date() : null,
      authorId: author.id,
    },
  });
}

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'admin1234';

  console.log('[seed] users…');
  await upsertUser({ email: adminEmail, name: 'Site Admin', password: adminPassword, role: Role.ADMIN });
  await upsertUser({ email: 'editor@example.com', name: 'Erin Editor', password: 'editor1234', role: Role.EDITOR });
  await upsertUser({ email: 'author1@example.com', name: 'Alex Author', password: 'author1234', role: Role.AUTHOR });
  await upsertUser({ email: 'author2@example.com', name: 'Avery Author', password: 'author1234', role: Role.AUTHOR });

  console.log('[seed] categories…');
  await upsertCategory('Engineering', 'Backend, infrastructure, and tooling deep dives.');
  await upsertCategory('Design', 'Visual design, UX, and design systems.');
  await upsertCategory('Product', 'Product strategy, discovery, and launches.');
  await upsertCategory('Culture', 'How we work and what we value.');
  await upsertCategory('Announcements', 'Company and product announcements.');

  console.log('[seed] tags…');
  const tagNames = [
    'typescript',
    'nextjs',
    'react',
    'prisma',
    'postgres',
    'design-systems',
    'accessibility',
    'performance',
    'security',
    'testing',
    'roadmap',
    'release-notes',
  ];
  for (const t of tagNames) await upsertTag(t);

  console.log('[seed] posts…');
  const now = Date.now();
  const days = (n: number) => new Date(now - n * 24 * 60 * 60 * 1000);
  const inDays = (n: number) => new Date(now + n * 24 * 60 * 60 * 1000);

  const posts: SeedPost[] = [
    {
      title: 'Welcome to the CMS',
      excerpt: 'A quick tour of what this platform can do for your editorial team.',
      body: '# Welcome\n\nThis is a sample post created by the seed script. Edit me from the admin UI.',
      status: ContentStatus.PUBLISHED,
      authorEmail: adminEmail,
      categories: ['Announcements'],
      tags: ['release-notes'],
      publishedAt: days(10),
    },
    {
      title: 'Building a Type-Safe API with Prisma',
      excerpt: 'How we use Prisma to keep our API and database schema in lockstep.',
      body: '## Prisma\n\nLong-form post body about Prisma, Zod, and Next.js Route Handlers.',
      status: ContentStatus.PUBLISHED,
      authorEmail: 'author1@example.com',
      categories: ['Engineering'],
      tags: ['typescript', 'prisma', 'postgres'],
      publishedAt: days(7),
    },
    {
      title: 'A Design System That Scales',
      excerpt: 'Lessons from building shared primitives across multiple product surfaces.',
      body: '## Design tokens\n\nWe codify our design language into tokens and primitives.',
      status: ContentStatus.PUBLISHED,
      authorEmail: 'author2@example.com',
      categories: ['Design'],
      tags: ['design-systems', 'accessibility'],
      publishedAt: days(5),
    },
    {
      title: 'Performance Audit: Q3 Recap',
      excerpt: 'What we shipped this quarter to keep page loads under 200ms.',
      body: '## Performance\n\nDetailed breakdown of perf wins this quarter.',
      status: ContentStatus.PUBLISHED,
      authorEmail: 'author1@example.com',
      categories: ['Engineering', 'Product'],
      tags: ['performance', 'nextjs'],
      publishedAt: days(3),
    },
    {
      title: 'Roadmap Preview: What is Coming Next',
      excerpt: 'A sneak peek at upcoming features.',
      body: 'Roadmap details and timing.',
      status: ContentStatus.IN_REVIEW,
      authorEmail: 'author2@example.com',
      categories: ['Product'],
      tags: ['roadmap'],
    },
    {
      title: 'Security Hardening Notes',
      excerpt: 'Recent improvements to authentication and session handling.',
      body: 'Security details and audit trail.',
      status: ContentStatus.IN_REVIEW,
      authorEmail: 'author1@example.com',
      categories: ['Engineering'],
      tags: ['security'],
    },
    {
      title: 'Untitled Draft About Testing',
      excerpt: 'Work in progress.',
      body: 'TODO: write the post.',
      status: ContentStatus.DRAFT,
      authorEmail: 'author1@example.com',
      categories: ['Engineering'],
      tags: ['testing'],
    },
    {
      title: 'Hiring Update Q4',
      excerpt: 'How our team is growing this quarter.',
      body: 'Hiring update body.',
      status: ContentStatus.DRAFT,
      authorEmail: 'author2@example.com',
      categories: ['Culture'],
      tags: [],
    },
    {
      title: 'Old Announcement Archived',
      excerpt: 'This announcement is no longer current.',
      body: 'Archived content body.',
      status: ContentStatus.ARCHIVED,
      authorEmail: adminEmail,
      categories: ['Announcements'],
      tags: ['release-notes'],
      publishedAt: days(120),
    },
    {
      title: 'Upcoming Scheduled Post',
      excerpt: 'A post scheduled to publish in the near future.',
      body: 'This post is scheduled to be auto-published.',
      status: ContentStatus.DRAFT,
      authorEmail: 'editor@example.com',
      categories: ['Announcements'],
      tags: ['release-notes'],
      scheduledFor: inDays(2),
    },
  ];

  for (const p of posts) await upsertPost(p);

  console.log('[seed] sample page…');
  await upsertPage({
    slug: 'about',
    title: 'About',
    body: '# About\n\nThis is a sample static page seeded by the database bootstrap script.',
    authorEmail: adminEmail,
  });

  console.log('[seed] done.');
}

main()
  .catch((err: unknown) => {
    console.error('[seed] failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
