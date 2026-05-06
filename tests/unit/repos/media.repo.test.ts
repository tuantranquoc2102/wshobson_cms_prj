import { describe, expect, it } from 'vitest';
import { MediaRepo } from '@/server/db/repos/media.repo';
import { asTx, makePrismaStub } from './_mockPrisma';

describe('MediaRepo', () => {
  it('create normalizes optional fields to null', async () => {
    const stub = makePrismaStub();
    await MediaRepo.create(
      {
        filename: 'foo.png',
        storagePath: '2026/05/foo.png',
        mimeType: 'image/png',
        kind: 'IMAGE',
        sizeBytes: 1234,
        uploadedById: 'u1',
      },
      asTx(stub),
    );
    expect(stub.media.create).toHaveBeenCalledWith({
      data: {
        filename: 'foo.png',
        storagePath: '2026/05/foo.png',
        mimeType: 'image/png',
        kind: 'IMAGE',
        sizeBytes: 1234,
        width: null,
        height: null,
        altText: null,
        uploadedById: 'u1',
      },
    });
  });

  it('findById uses the unique id index', async () => {
    const stub = makePrismaStub();
    await MediaRepo.findById('m1', asTx(stub));
    expect(stub.media.findUnique).toHaveBeenCalledWith({ where: { id: 'm1' } });
  });

  it('listByUploader paginates newest-first', async () => {
    const stub = makePrismaStub();
    await MediaRepo.listByUploader('u1', { page: 3, pageSize: 5 }, asTx(stub));
    expect(stub.media.findMany).toHaveBeenCalledWith({
      where: { uploadedById: 'u1' },
      orderBy: { createdAt: 'desc' },
      skip: 10,
      take: 5,
    });
  });

  it('delete hard-deletes the row', async () => {
    const stub = makePrismaStub();
    await MediaRepo.delete('m1', asTx(stub));
    expect(stub.media.delete).toHaveBeenCalledWith({ where: { id: 'm1' } });
  });
});
