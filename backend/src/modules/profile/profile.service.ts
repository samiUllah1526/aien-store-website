import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SaveShippingDto } from './dto/save-shipping.dto';

export interface SavedShippingDto {
  customerName: string | null;
  customerPhone: string | null;
  shippingCountry: string | null;
  shippingAddressLine1: string | null;
  shippingAddressLine2: string | null;
  shippingCity: string | null;
  shippingPostalCode: string | null;
}

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getSavedShipping(userId: string): Promise<SavedShippingDto | null> {
    const row = await this.prisma.userSavedShipping.findUnique({
      where: { userId },
    });
    if (!row) return null;
    return {
      customerName: row.customerName ?? null,
      customerPhone: row.customerPhone ?? null,
      shippingCountry: row.shippingCountry ?? null,
      shippingAddressLine1: row.shippingAddressLine1 ?? null,
      shippingAddressLine2: row.shippingAddressLine2 ?? null,
      shippingCity: row.shippingCity ?? null,
      shippingPostalCode: row.shippingPostalCode ?? null,
    };
  }

  async saveShipping(userId: string, dto: SaveShippingDto): Promise<SavedShippingDto> {
    const data = {
      customerName: dto.customerName?.trim() || null,
      customerPhone: dto.customerPhone?.trim() || null,
      shippingCountry: dto.shippingCountry?.trim() || null,
      shippingAddressLine1: dto.shippingAddressLine1?.trim() || null,
      shippingAddressLine2: dto.shippingAddressLine2?.trim() || null,
      shippingCity: dto.shippingCity?.trim() || null,
      shippingPostalCode: dto.shippingPostalCode?.trim() || null,
    };
    const row = await this.prisma.userSavedShipping.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
    return {
      customerName: row.customerName ?? null,
      customerPhone: row.customerPhone ?? null,
      shippingCountry: row.shippingCountry ?? null,
      shippingAddressLine1: row.shippingAddressLine1 ?? null,
      shippingAddressLine2: row.shippingAddressLine2 ?? null,
      shippingCity: row.shippingCity ?? null,
      shippingPostalCode: row.shippingPostalCode ?? null,
    };
  }
}
