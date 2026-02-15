import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { SettingsKey } from './dto/update-setting.dto';

export interface GeneralValue {
  logoMediaId?: string | null;
}

export interface AboutValue {
  title?: string;
  subtitle?: string;
  content?: string;
}

export interface FooterValue {
  tagline?: string;
  copyright?: string;
}

export interface SocialValue {
  facebook?: string;
  facebookVisible?: boolean;
  instagram?: string;
  instagramVisible?: boolean;
  twitter?: string;
  twitterVisible?: boolean;
  youtube?: string;
  youtubeVisible?: boolean;
}

export interface PublicSettingsDto {
  logoPath: string | null;
  about: AboutValue;
  footer: FooterValue;
  social: SocialValue;
}

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getByKey(key: string): Promise<Record<string, unknown> | null> {
    const row = await this.prisma.siteSetting.findUnique({
      where: { key },
    });
    return row ? (row.value as Record<string, unknown>) : null;
  }

  async getAll(): Promise<Record<string, Record<string, unknown>>> {
    const rows = await this.prisma.siteSetting.findMany();
    const out: Record<string, Record<string, unknown>> = {};
    for (const row of rows) {
      out[row.key] = row.value as Record<string, unknown>;
    }
    return out;
  }

  async set(key: SettingsKey, value: Record<string, unknown>): Promise<void> {
    await this.prisma.siteSetting.upsert({
      where: { key },
      create: { key, value: value as object },
      update: { value: value as object },
    });
  }

  /** Resolve logo media ID to file path for public API. */
  private async resolveLogoPath(logoMediaId: string | null | undefined): Promise<string | null> {
    if (!logoMediaId) return null;
    const media = await this.prisma.media.findUnique({
      where: { id: logoMediaId },
      select: { path: true },
    });
    return media?.path ?? null;
  }

  async getPublic(): Promise<PublicSettingsDto> {
    const [general, about, footer, social] = await Promise.all([
      this.getByKey('general'),
      this.getByKey('about'),
      this.getByKey('footer'),
      this.getByKey('social'),
    ]);

    const generalVal = general as GeneralValue | null;
    const logoPath = await this.resolveLogoPath(generalVal?.logoMediaId ?? null);

    return {
      logoPath,
      about: (about as AboutValue) ?? {},
      footer: (footer as FooterValue) ?? {},
      social: (social as SocialValue) ?? {},
    };
  }
}
