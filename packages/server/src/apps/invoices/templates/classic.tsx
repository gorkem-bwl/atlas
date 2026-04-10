import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import type { InvoiceTemplateProps } from './types';

function formatCurrency(amount: number, currency: string): string {
  return `${amount.toFixed(2)} ${currency}`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    color: '#1a1a1a',
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 48,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  logo: {
    width: 80,
    height: 40,
    objectFit: 'contain',
  },
  companyName: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
  },
  invoiceTitle: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
  },
  companyInfoBlock: {
    marginBottom: 12,
  },
  companyInfoLine: {
    fontSize: 8,
    color: '#555555',
    marginBottom: 2,
  },
  divider: {
    height: 2,
    marginBottom: 16,
    marginTop: 4,
  },
  twoCol: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  billToCol: {
    flex: 1,
    marginRight: 24,
  },
  metaCol: {
    width: 180,
  },
  sectionLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#888888',
    textTransform: 'uppercase',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  clientName: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 3,
  },
  clientLine: {
    fontSize: 8,
    color: '#444444',
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  metaKey: {
    fontSize: 8,
    color: '#888888',
    width: 80,
  },
  metaValue: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
    flex: 1,
  },
  table: {
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableHeaderText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  colDescription: { flex: 3 },
  colQty: { flex: 1, textAlign: 'right' },
  colUnitPrice: { flex: 1.5, textAlign: 'right' },
  colAmount: { flex: 1.5, textAlign: 'right' },
  tableCell: {
    fontSize: 8,
    color: '#1a1a1a',
  },
  tableCellRight: {
    fontSize: 8,
    color: '#1a1a1a',
    textAlign: 'right',
  },
  totalsBlock: {
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 3,
    width: 220,
  },
  totalsLabel: {
    fontSize: 8,
    color: '#555555',
    width: 110,
    textAlign: 'right',
    marginRight: 12,
  },
  totalsValue: {
    fontSize: 8,
    width: 100,
    textAlign: 'right',
  },
  totalRowFinal: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
    paddingTop: 4,
    width: 220,
    borderTopWidth: 1,
    borderTopColor: '#cccccc',
  },
  totalLabelFinal: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    width: 110,
    textAlign: 'right',
    marginRight: 12,
  },
  totalValueFinal: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    width: 100,
    textAlign: 'right',
  },
  infoSection: {
    marginBottom: 16,
    padding: 10,
    backgroundColor: '#f8f8f8',
    borderRadius: 4,
  },
  infoSectionTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 5,
  },
  infoSectionText: {
    fontSize: 8,
    color: '#444444',
    lineHeight: 1.5,
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 48,
    right: 48,
    textAlign: 'center',
    fontSize: 7,
    color: '#aaaaaa',
  },
});

export function ClassicTemplate({ invoice, lineItems, branding, client }: InvoiceTemplateProps) {
  const accent = branding.accentColor || '#13715B';

  const statusColors: Record<string, string> = {
    paid: '#16a34a',
    draft: '#6b7280',
    sent: '#2563eb',
    overdue: '#dc2626',
    cancelled: '#9ca3af',
  };
  const statusColor = statusColors[invoice.status?.toLowerCase()] || '#6b7280';

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            {branding.logoBase64 ? (
              <Image style={styles.logo} src={`data:image/png;base64,${branding.logoBase64}`} />
            ) : (
              <Text style={styles.companyName}>{branding.companyName || 'Company Name'}</Text>
            )}
          </View>
          <Text style={[styles.invoiceTitle, { color: accent }]}>INVOICE</Text>
        </View>

        {/* Company info block */}
        <View style={styles.companyInfoBlock}>
          {branding.logoBase64 && branding.companyName ? (
            <Text style={[styles.companyInfoLine, { fontFamily: 'Helvetica-Bold', color: '#1a1a1a', marginBottom: 4 }]}>
              {branding.companyName}
            </Text>
          ) : null}
          {branding.companyAddress ? <Text style={styles.companyInfoLine}>{branding.companyAddress}</Text> : null}
          {(branding.companyCity || branding.companyCountry) ? (
            <Text style={styles.companyInfoLine}>
              {[branding.companyCity, branding.companyCountry].filter(Boolean).join(', ')}
            </Text>
          ) : null}
          {branding.companyPhone ? <Text style={styles.companyInfoLine}>{branding.companyPhone}</Text> : null}
          {branding.companyEmail ? <Text style={styles.companyInfoLine}>{branding.companyEmail}</Text> : null}
          {branding.companyWebsite ? <Text style={styles.companyInfoLine}>{branding.companyWebsite}</Text> : null}
          {branding.companyTaxId ? <Text style={styles.companyInfoLine}>Tax ID: {branding.companyTaxId}</Text> : null}
        </View>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: accent }]} />

        {/* Two-column: Bill To + Invoice Meta */}
        <View style={styles.twoCol}>
          <View style={styles.billToCol}>
            <Text style={styles.sectionLabel}>Bill To</Text>
            <Text style={styles.clientName}>{client.name}</Text>
            {client.address ? <Text style={styles.clientLine}>{client.address}</Text> : null}
            {(client.city || client.state || client.postalCode) ? (
              <Text style={styles.clientLine}>
                {[client.city, client.state, client.postalCode].filter(Boolean).join(', ')}
              </Text>
            ) : null}
            {client.country ? <Text style={styles.clientLine}>{client.country}</Text> : null}
            {client.taxId ? <Text style={styles.clientLine}>Tax ID: {client.taxId}</Text> : null}
            {client.contactName ? <Text style={[styles.clientLine, { marginTop: 4 }]}>{client.contactName}</Text> : null}
            {client.contactEmail ? <Text style={styles.clientLine}>{client.contactEmail}</Text> : null}
          </View>

          <View style={styles.metaCol}>
            <Text style={styles.sectionLabel}>Invoice Details</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaKey}>Invoice #</Text>
              <Text style={styles.metaValue}>{invoice.invoiceNumber}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaKey}>Issue Date</Text>
              <Text style={styles.metaValue}>{formatDate(invoice.issueDate)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaKey}>Due Date</Text>
              <Text style={styles.metaValue}>{formatDate(invoice.dueDate)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaKey}>Status</Text>
              <Text style={[styles.metaValue, { color: statusColor }]}>
                {invoice.status ? invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1) : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* Line items table */}
        <View style={styles.table}>
          {/* Table header */}
          <View style={[styles.tableHeader, { backgroundColor: accent }]}>
            <Text style={[styles.tableHeaderText, styles.colDescription]}>Description</Text>
            <Text style={[styles.tableHeaderText, styles.colQty]}>Qty</Text>
            <Text style={[styles.tableHeaderText, styles.colUnitPrice]}>Unit Price</Text>
            <Text style={[styles.tableHeaderText, styles.colAmount]}>Amount</Text>
          </View>

          {/* Table rows */}
          {lineItems.map((item, index) => (
            <View
              key={index}
              style={[styles.tableRow, { backgroundColor: index % 2 === 1 ? '#f5f5f5' : '#ffffff' }]}
            >
              <Text style={[styles.tableCell, styles.colDescription]}>{item.description}</Text>
              <Text style={[styles.tableCellRight, styles.colQty]}>{item.quantity}</Text>
              <Text style={[styles.tableCellRight, styles.colUnitPrice]}>
                {formatCurrency(item.unitPrice, invoice.currency)}
              </Text>
              <Text style={[styles.tableCellRight, styles.colAmount]}>
                {formatCurrency(item.amount, invoice.currency)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotal</Text>
            <Text style={styles.totalsValue}>{formatCurrency(invoice.subtotal, invoice.currency)}</Text>
          </View>
          {invoice.taxAmount > 0 ? (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Tax ({invoice.taxPercent}%)</Text>
              <Text style={styles.totalsValue}>{formatCurrency(invoice.taxAmount, invoice.currency)}</Text>
            </View>
          ) : null}
          {invoice.discountAmount > 0 ? (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Discount ({invoice.discountPercent}%)</Text>
              <Text style={[styles.totalsValue, { color: '#16a34a' }]}>
                -{formatCurrency(invoice.discountAmount, invoice.currency)}
              </Text>
            </View>
          ) : null}
          <View style={styles.totalRowFinal}>
            <Text style={styles.totalLabelFinal}>Total</Text>
            <Text style={[styles.totalValueFinal, { color: accent }]}>
              {formatCurrency(invoice.total, invoice.currency)}
            </Text>
          </View>
        </View>

        {/* Payment information */}
        {(branding.paymentInstructions || branding.bankDetails) ? (
          <View style={styles.infoSection}>
            <Text style={[styles.infoSectionTitle, { color: accent }]}>Payment Information</Text>
            {branding.paymentInstructions ? (
              <Text style={styles.infoSectionText}>{branding.paymentInstructions}</Text>
            ) : null}
            {branding.bankDetails ? (
              <Text style={[styles.infoSectionText, { marginTop: 4 }]}>{branding.bankDetails}</Text>
            ) : null}
          </View>
        ) : null}

        {/* Notes */}
        {invoice.notes ? (
          <View style={styles.infoSection}>
            <Text style={[styles.infoSectionTitle, { color: accent }]}>Notes</Text>
            <Text style={styles.infoSectionText}>{invoice.notes}</Text>
          </View>
        ) : null}

        {/* Footer */}
        <Text style={styles.footer}>
          {branding.footerText || 'Generated by Atlas'}
        </Text>
      </Page>
    </Document>
  );
}
