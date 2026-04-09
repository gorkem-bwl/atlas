import { db } from '../../../config/database';
import {
  invoiceSettings,
} from '../../../db/schema';
import { eq } from 'drizzle-orm';

// ─── Settings ───────────────────────────────────────────────────────

export async function getInvoiceSettings(tenantId: string) {
  const [settings] = await db
    .select()
    .from(invoiceSettings)
    .where(eq(invoiceSettings.tenantId, tenantId))
    .limit(1);

  return settings || null;
}

export async function updateInvoiceSettings(tenantId: string, input: {
  invoicePrefix?: string;
  nextInvoiceNumber?: number;
  defaultCurrency?: string;
  defaultTaxRate?: number;
  eFaturaEnabled?: boolean;
  eFaturaCompanyName?: string | null;
  eFaturaCompanyTaxId?: string | null;
  eFaturaCompanyTaxOffice?: string | null;
  eFaturaCompanyAddress?: string | null;
  eFaturaCompanyCity?: string | null;
  eFaturaCompanyCountry?: string | null;
  eFaturaCompanyPhone?: string | null;
  eFaturaCompanyEmail?: string | null;
}) {
  const now = new Date();

  // Upsert
  let [existing] = await db
    .select()
    .from(invoiceSettings)
    .where(eq(invoiceSettings.tenantId, tenantId))
    .limit(1);

  if (!existing) {
    const [created] = await db
      .insert(invoiceSettings)
      .values({
        tenantId,
        ...input,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return created;
  }

  const updates: Record<string, unknown> = { updatedAt: now };
  if (input.invoicePrefix !== undefined) updates.invoicePrefix = input.invoicePrefix;
  if (input.nextInvoiceNumber !== undefined) updates.nextInvoiceNumber = input.nextInvoiceNumber;
  if (input.defaultCurrency !== undefined) updates.defaultCurrency = input.defaultCurrency;
  if (input.defaultTaxRate !== undefined) updates.defaultTaxRate = input.defaultTaxRate;
  if (input.eFaturaEnabled !== undefined) updates.eFaturaEnabled = input.eFaturaEnabled;
  if (input.eFaturaCompanyName !== undefined) updates.eFaturaCompanyName = input.eFaturaCompanyName;
  if (input.eFaturaCompanyTaxId !== undefined) updates.eFaturaCompanyTaxId = input.eFaturaCompanyTaxId;
  if (input.eFaturaCompanyTaxOffice !== undefined) updates.eFaturaCompanyTaxOffice = input.eFaturaCompanyTaxOffice;
  if (input.eFaturaCompanyAddress !== undefined) updates.eFaturaCompanyAddress = input.eFaturaCompanyAddress;
  if (input.eFaturaCompanyCity !== undefined) updates.eFaturaCompanyCity = input.eFaturaCompanyCity;
  if (input.eFaturaCompanyCountry !== undefined) updates.eFaturaCompanyCountry = input.eFaturaCompanyCountry;
  if (input.eFaturaCompanyPhone !== undefined) updates.eFaturaCompanyPhone = input.eFaturaCompanyPhone;
  if (input.eFaturaCompanyEmail !== undefined) updates.eFaturaCompanyEmail = input.eFaturaCompanyEmail;

  const [updated] = await db
    .update(invoiceSettings)
    .set(updates)
    .where(eq(invoiceSettings.tenantId, tenantId))
    .returning();

  return updated ?? null;
}
