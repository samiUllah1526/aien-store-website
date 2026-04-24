import { IsIn, IsObject } from 'class-validator';

export const SETTINGS_KEYS = [
  'general',
  'about',
  'footer',
  'social',
  'delivery',
  'banking',
  'seo',
  'business',
  'marketing',
  'announcement',
  'hero',
] as const;
export type SettingsKey = (typeof SETTINGS_KEYS)[number];

export class UpdateSettingDto {
  @IsIn(SETTINGS_KEYS, {
    message:
      'key must be one of: general, about, footer, social, delivery, banking, seo, business, marketing, announcement, hero',
  })
  key: SettingsKey;

  @IsObject()
  value: Record<string, unknown>;
}
