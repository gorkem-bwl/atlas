export interface InvoiceTemplateProps {
  invoice: {
    invoiceNumber: string;
    status: string;
    currency: string;
    subtotal: number;
    taxPercent: number;
    taxAmount: number;
    discountPercent: number;
    discountAmount: number;
    total: number;
    notes?: string | null;
    issueDate: string;
    dueDate: string;
  };

  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    taxRate: number;
  }>;

  branding: {
    logoBase64?: string;
    accentColor: string;
    companyName?: string;
    companyAddress?: string;
    companyCity?: string;
    companyCountry?: string;
    companyPhone?: string;
    companyEmail?: string;
    companyWebsite?: string;
    companyTaxId?: string;
    paymentInstructions?: string;
    bankDetails?: string;
    footerText?: string;
  };

  client: {
    name: string;
    address?: string;
    postalCode?: string;
    city?: string;
    state?: string;
    country?: string;
    taxId?: string;
    contactName?: string;
    contactEmail?: string;
  };
}
