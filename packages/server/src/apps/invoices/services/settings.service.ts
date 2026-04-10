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
  templateId?: string;
  logoPath?: string | null;
  accentColor?: string;
  companyName?: string | null;
  companyAddress?: string | null;
  companyCity?: string | null;
  companyCountry?: string | null;
  companyPhone?: string | null;
  companyEmail?: string | null;
  companyWebsite?: string | null;
  companyTaxId?: string | null;
  paymentInstructions?: string | null;
  bankDetails?: string | null;
  footerText?: string | null;
  reminderEnabled?: boolean;
  reminder1Days?: number;
  reminder2Days?: number;
  reminder3Days?: number;
  endlessReminderDays?: number;
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
  if (input.templateId !== undefined) updates.templateId = input.templateId;
  if (input.logoPath !== undefined) updates.logoPath = input.logoPath;
  if (input.accentColor !== undefined) updates.accentColor = input.accentColor;
  if (input.companyName !== undefined) updates.companyName = input.companyName;
  if (input.companyAddress !== undefined) updates.companyAddress = input.companyAddress;
  if (input.companyCity !== undefined) updates.companyCity = input.companyCity;
  if (input.companyCountry !== undefined) updates.companyCountry = input.companyCountry;
  if (input.companyPhone !== undefined) updates.companyPhone = input.companyPhone;
  if (input.companyEmail !== undefined) updates.companyEmail = input.companyEmail;
  if (input.companyWebsite !== undefined) updates.companyWebsite = input.companyWebsite;
  if (input.companyTaxId !== undefined) updates.companyTaxId = input.companyTaxId;
  if (input.paymentInstructions !== undefined) updates.paymentInstructions = input.paymentInstructions;
  if (input.bankDetails !== undefined) updates.bankDetails = input.bankDetails;
  if (input.footerText !== undefined) updates.footerText = input.footerText;
  if (input.reminderEnabled !== undefined) updates.reminderEnabled = input.reminderEnabled;
  if (input.reminder1Days !== undefined) updates.reminder1Days = input.reminder1Days;
  if (input.reminder2Days !== undefined) updates.reminder2Days = input.reminder2Days;
  if (input.reminder3Days !== undefined) updates.reminder3Days = input.reminder3Days;
  if (input.endlessReminderDays !== undefined) updates.endlessReminderDays = input.endlessReminderDays;

  const [updated] = await db
    .update(invoiceSettings)
    .set(updates)
    .where(eq(invoiceSettings.tenantId, tenantId))
    .returning();

  return updated ?? null;
}
