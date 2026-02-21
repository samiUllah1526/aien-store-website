import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageProviderFactory } from './storage/storage-provider.factory';
import { MediaService } from './media.service';
import * as fsPromises from 'fs/promises';

jest.mock('fs/promises', () => ({
  writeFile: jest.fn().mockResolvedValue(undefined),
  mkdir: jest.fn().mockResolvedValue(undefined),
}));

const mediaId = '11111111-1111-1111-1111-111111111111';

describe('MediaService', () => {
  let service: MediaService;
  let prisma: { media: { create: jest.Mock; findUnique: jest.Mock } };
  let storageFactory: { getByType: jest.Mock; getRemoteProvider: jest.Mock };

  beforeEach(async () => {
    prisma = {
      media: { create: jest.fn(), findUnique: jest.fn() },
    };
    storageFactory = {
      getByType: jest.fn(),
      getRemoteProvider: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageProviderFactory, useValue: storageFactory },
        {
          provide: ConfigService,
          useValue: { get: jest.fn((key: string) => (key === 'storage.uploadDir' ? '/tmp/uploads' : undefined)) },
        },
      ],
    }).compile();

    service = module.get<MediaService>(MediaService);
  });

  describe('registerUpload', () => {
    it('creates media from storageKey and deliveryUrl', async () => {
      prisma.media.create.mockResolvedValue({ id: mediaId });

      const result = await service.registerUpload(
        {
          provider: 'cloudinary',
          storageKey: 'products/abc123',
          deliveryUrl: 'https://cdn.example.com/abc123.jpg',
        },
        'product',
      );

      expect(result.id).toBe(mediaId);
      expect(prisma.media.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          storageKey: 'products/abc123',
          deliveryUrl: 'https://cdn.example.com/abc123.jpg',
          storageProvider: 'cloudinary',
          source: 'product',
        }),
      });
    });

    it('throws BadRequestException when neither storageKey/deliveryUrl nor providerResponse provided', async () => {
      await expect(
        service.registerUpload({ provider: 'cloudinary' }, 'product'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when providerResponse invalid', async () => {
      const mockProvider = { parseUploadResponse: jest.fn().mockReturnValue(null) };
      storageFactory.getByType.mockReturnValue(mockProvider);

      await expect(
        service.registerUpload(
          { provider: 'cloudinary', providerResponse: { invalid: true } },
          'product',
        ),
      ).rejects.toThrow('Invalid provider response');
    });
  });

  describe('createFromFile', () => {
    it('creates media and writes file to products/', async () => {
      prisma.media.create.mockResolvedValue({ id: mediaId });

      const result = await service.createFromFile({
        buffer: Buffer.from('x'),
        originalname: 'photo.jpg',
        mimetype: 'image/jpeg',
        size: 100,
      });

      expect(result.id).toBe(mediaId);
      expect(fsPromises.mkdir).toHaveBeenCalled();
      expect(fsPromises.writeFile).toHaveBeenCalled();
      expect(prisma.media.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          path: expect.stringContaining('products/'),
          storageProvider: 'local',
          source: 'product',
        }),
      });
    });
  });

  describe('createFromFileForPaymentProof', () => {
    it('creates media in payment-proofs/', async () => {
      prisma.media.create.mockResolvedValue({ id: mediaId });

      const result = await service.createFromFileForPaymentProof({
        buffer: Buffer.from('x'),
        originalname: 'proof.png',
        mimetype: 'image/png',
        size: 50,
      });

      expect(result.id).toBe(mediaId);
      expect(prisma.media.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          path: expect.stringContaining('payment-proofs/'),
          source: 'payment_proof',
        }),
      });
    });
  });

  describe('getById', () => {
    it('returns media when found', async () => {
      const media = { id: mediaId, path: 'products/x.jpg' };
      prisma.media.findUnique.mockResolvedValue(media);

      const result = await service.getById(mediaId);
      expect(result).toEqual(media);
    });

    it('throws BadRequestException when not found', async () => {
      prisma.media.findUnique.mockResolvedValue(null);

      await expect(service.getById('missing')).rejects.toThrow(BadRequestException);
    });
  });

  describe('createFailedUpload', () => {
    it('creates media record with uploadError', async () => {
      prisma.media.create.mockResolvedValue({});

      await service.createFailedUpload({
        source: 'product',
        error: new Error('Upload failed'),
        filename: 'bad.jpg',
      });

      expect(prisma.media.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          path: expect.stringContaining('failed/'),
          source: 'product',
          uploadError: expect.objectContaining({
            message: 'Upload failed',
            purpose: 'product',
          }),
        }),
      });
    });
  });

  describe('getFilePath', () => {
    it('returns joined path with uploadDir', () => {
      const path = service.getFilePath('products/abc.jpg');
      expect(path).toContain('products');
      expect(path).toContain('abc.jpg');
    });
  });
});
