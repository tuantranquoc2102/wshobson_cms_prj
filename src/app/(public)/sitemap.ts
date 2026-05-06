import type { MetadataRoute } from 'next';
import { prisma } from '@/server/db/prisma';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, pages, categories, tags] = await Promise.all([
    prisma.content.findMany({
      where: {
        type: 'POST',
        status: 'PUBLISHED',
        publishedAt: { lte: new Date() },
        deletedAt: null,
      },
      select: { slug: true, updatedAt: true },
    }),
    prisma.content.findMany({
      where: {
        type: 'PAGE',
        status: 'PUBLISHED',
        publishedAt: { lte: new Date() },
        deletedAt: null,
      },
      select: { slug: true, updatedAt: true },
    }),
    prisma.category.findMany({ select: { slug: true, createdAt: true } }),
    prisma.tag.findMany({ select: { slug: true, createdAt: true } }),
  ]);

  return [
    { url: BASE_URL, lastModified: new Date() },
    ...posts.map((p) => ({
      url: `${BASE_URL}/blog/${p.slug}`,
      lastModified: p.updatedAt,
    })),
    ...pages.map((p) => ({
      url: `${BASE_URL}/p/${p.slug}`,
      lastModified: p.updatedAt,
    })),
    ...categories.map((c) => ({
      url: `${BASE_URL}/category/${c.slug}`,
      lastModified: c.createdAt,
    })),
    ...tags.map((t) => ({
      url: `${BASE_URL}/tag/${t.slug}`,
      lastModified: t.createdAt,
    })),
  ];
}
