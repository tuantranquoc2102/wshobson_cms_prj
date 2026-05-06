import { describe, expect, it } from 'vitest';
import { TaxonomyRepo } from '@/server/db/repos/taxonomy.repo';
import { asTx, makePrismaStub } from './_mockPrisma';

describe('TaxonomyRepo', () => {
  it('listCategories orders alphabetically', async () => {
    const stub = makePrismaStub();
    await TaxonomyRepo.listCategories(asTx(stub));
    expect(stub.category.findMany).toHaveBeenCalledWith({ orderBy: { name: 'asc' } });
  });

  it('upsertCategory keys by slug', async () => {
    const stub = makePrismaStub();
    await TaxonomyRepo.upsertCategory({ slug: 'eng', name: 'Engineering' }, asTx(stub));
    const arg = stub.category.upsert.mock.calls[0]?.[0] as {
      where: { slug: string };
      update: { name: string; description: null };
      create: { slug: string; name: string; description: null };
    };
    expect(arg.where).toEqual({ slug: 'eng' });
    expect(arg.update).toEqual({ name: 'Engineering', description: null });
    expect(arg.create).toEqual({ slug: 'eng', name: 'Engineering', description: null });
  });

  it('setContentCategories deletes stale joins and creates new ones', async () => {
    const stub = makePrismaStub();
    await TaxonomyRepo.setContentCategories('c1', ['cat1', 'cat2'], asTx(stub));
    expect(stub.contentCategory.deleteMany).toHaveBeenCalledWith({
      where: { contentId: 'c1', categoryId: { notIn: ['cat1', 'cat2'] } },
    });
    expect(stub.contentCategory.createMany).toHaveBeenCalledWith({
      data: [
        { contentId: 'c1', categoryId: 'cat1' },
        { contentId: 'c1', categoryId: 'cat2' },
      ],
      skipDuplicates: true,
    });
  });

  it('setContentCategories with an empty list deletes all joins for the content', async () => {
    const stub = makePrismaStub();
    await TaxonomyRepo.setContentCategories('c1', [], asTx(stub));
    expect(stub.contentCategory.deleteMany).toHaveBeenCalledWith({ where: { contentId: 'c1' } });
    expect(stub.contentCategory.createMany).not.toHaveBeenCalled();
  });

  it('listTags orders alphabetically', async () => {
    const stub = makePrismaStub();
    await TaxonomyRepo.listTags(asTx(stub));
    expect(stub.tag.findMany).toHaveBeenCalledWith({ orderBy: { name: 'asc' } });
  });

  it('upsertTag keys by slug', async () => {
    const stub = makePrismaStub();
    await TaxonomyRepo.upsertTag({ slug: 'ts', name: 'typescript' }, asTx(stub));
    expect(stub.tag.upsert).toHaveBeenCalledWith({
      where: { slug: 'ts' },
      update: { name: 'typescript' },
      create: { slug: 'ts', name: 'typescript' },
    });
  });

  it('setContentTags deletes stale joins and creates new ones', async () => {
    const stub = makePrismaStub();
    await TaxonomyRepo.setContentTags('c1', ['t1'], asTx(stub));
    expect(stub.contentTag.deleteMany).toHaveBeenCalledWith({
      where: { contentId: 'c1', tagId: { notIn: ['t1'] } },
    });
    expect(stub.contentTag.createMany).toHaveBeenCalledWith({
      data: [{ contentId: 'c1', tagId: 't1' }],
      skipDuplicates: true,
    });
  });
});
