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
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 7,
    color: '#1a1a1a',
    paddingTop: 28,
    paddingBottom: 40,
    paddingHorizontal: 36,
  },
  // Header: single horizontal row
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 36,
    height: 18,
    objectFit: 'contain',
    marginRight: 6,
  },
  companyName: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  invoiceTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1,
  },
  invoiceNumber: {
    fontSize: 7,
    color: '#555555',
    marginTop: 1,
  },
  // Thin divider
  divider: {
    height: 0.5,
    backgroundColor: '#cccccc',
    marginBottom: 8,
  },
  // Info row: 3 columns
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  infoCol: {
    flex: 1,
    marginRight: 12,
  },
  infoColLast: {
    flex: 1,
    marginRight: 0,
  },
  colLabel: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    color: '#888888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  colBodyBold: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 1,
  },
  colBody: {
    fontSize: 7,
    color: '#444444',
    marginBottom: 1,
  },
  // Meta rows inside info col
  metaLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  metaKey: {
    fontSize: 7,
    color: '#888888',
  },
  metaVal: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
  },
  // Table
  table: {
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: '#cccccc',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#cccccc',
  },
  tableHeaderText: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#eeeeee',
  },
  tableRowLast: {
    flexDirection: 'row',
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  colDescription: { flex: 3 },
  colQty: { flex: 1, textAlign: 'right' },
  colUnitPrice: { flex: 1.5, textAlign: 'right' },
  colAmount: { flex: 1.5, textAlign: 'right' },
  tableCell: {
    fontSize: 7,
    color: '#1a1a1a',
  },
  tableCellRight: {
    fontSize: 7,
    color: '#1a1a1a',
    textAlign: 'right',
  },
  // Totals
  totalsBlock: {
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 2,
    width: 180,
  },
  totalsLabel: {
    fontSize: 7,
    color: '#555555',
    width: 90,
    textAlign: 'right',
    marginRight: 10,
  },
  totalsValue: {
    fontSize: 7,
    width: 80,
    textAlign: 'right',
  },
  totalRowFinal: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 3,
    paddingTop: 3,
    width: 180,
    borderTopWidth: 0.5,
    borderTopColor: '#cccccc',
  },
  totalLabelFinal: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    width: 90,
    textAlign: 'right',
    marginRight: 10,
  },
  totalValueFinal: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    width: 80,
    textAlign: 'right',
  },
  // Payment / Notes
  compactSection: {
    marginBottom: 8,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderWidth: 0.5,
    borderColor: '#dddddd',
    borderRadius: 2,
  },
  compactSectionTitle: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 3,
  },
  compactSectionText: {
    fontSize: 7,
    color: '#444444',
    lineHeight: 1.4,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 16,
    left: 36,
    right: 36,
    textAlign: 'center',
    fontSize: 6,
    color: '#aaaaaa',
  },
});

export function CompactTemplate({ invoice, lineItems, branding, client }: InvoiceTemplateProps) {
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

        {/* Header row: logo + company name | INVOICE + invoice# */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            {branding.logoBase64 ? (
              <Image style={styles.logo} src={`data:image/png;base64,${branding.logoBase64}`} />
            ) : null}
            <Text style={styles.companyName}>{branding.companyName || 'Company Name'}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={[styles.invoiceTitle, { color: accent }]}>INVOICE</Text>
            <Text style={styles.invoiceNumber}># {invoice.invoiceNumber}</Text>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Info row: company info | bill-to | invoice meta */}
        <View style={styles.infoRow}>
          {/* Column 1: Company info */}
          <View style={styles.infoCol}>
            <Text style={styles.colLabel}>From</Text>
            {branding.companyAddress ? <Text style={styles.colBody}>{branding.companyAddress}</Text> : null}
            {(branding.companyCity || branding.companyCountry) ? (
              <Text style={styles.colBody}>
                {[branding.companyCity, branding.companyCountry].filter(Boolean).join(', ')}
              </Text>
            ) : null}
            {branding.companyPhone ? <Text style={styles.colBody}>{branding.companyPhone}</Text> : null}
            {branding.companyEmail ? <Text style={styles.colBody}>{branding.companyEmail}</Text> : null}
            {branding.companyWebsite ? <Text style={styles.colBody}>{branding.companyWebsite}</Text> : null}
            {branding.companyTaxId ? <Text style={styles.colBody}>Tax ID: {branding.companyTaxId}</Text> : null}
          </View>

          {/* Column 2: Bill to */}
          <View style={styles.infoCol}>
            <Text style={styles.colLabel}>Bill To</Text>
            <Text style={styles.colBodyBold}>{client.name}</Text>
            {client.address ? <Text style={styles.colBody}>{client.address}</Text> : null}
            {(client.city || client.state || client.postalCode) ? (
              <Text style={styles.colBody}>
                {[client.city, client.state, client.postalCode].filter(Boolean).join(', ')}
              </Text>
            ) : null}
            {client.country ? <Text style={styles.colBody}>{client.country}</Text> : null}
            {client.taxId ? <Text style={styles.colBody}>Tax ID: {client.taxId}</Text> : null}
            {client.contactName ? <Text style={styles.colBody}>{client.contactName}</Text> : null}
            {client.contactEmail ? <Text style={styles.colBody}>{client.contactEmail}</Text> : null}
          </View>

          {/* Column 3: Invoice meta */}
          <View style={styles.infoColLast}>
            <Text style={styles.colLabel}>Details</Text>
            <View style={styles.metaLine}>
              <Text style={styles.metaKey}>Issue Date</Text>
              <Text style={styles.metaVal}>{formatDate(invoice.issueDate)}</Text>
            </View>
            <View style={styles.metaLine}>
              <Text style={styles.metaKey}>Due Date</Text>
              <Text style={styles.metaVal}>{formatDate(invoice.dueDate)}</Text>
            </View>
            <View style={styles.metaLine}>
              <Text style={styles.metaKey}>Status</Text>
              <Text style={[styles.metaVal, { color: statusColor }]}>
                {invoice.status ? invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1) : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* Line items table with thin 0.5pt borders, tight padding, no alternating backgrounds */}
        <View style={styles.table}>
          <View style={[styles.tableHeader, { backgroundColor: accent }]}>
            <Text style={[styles.tableHeaderText, styles.colDescription]}>Description</Text>
            <Text style={[styles.tableHeaderText, styles.colQty]}>Qty</Text>
            <Text style={[styles.tableHeaderText, styles.colUnitPrice]}>Unit Price</Text>
            <Text style={[styles.tableHeaderText, styles.colAmount]}>Amount</Text>
          </View>

          {lineItems.map((item, index) => (
            <View
              key={index}
              style={index === lineItems.length - 1 ? styles.tableRowLast : styles.tableRow}
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

        {/* Totals: compact, right-aligned */}
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

        {/* Payment information — only if data exists */}
        {(branding.paymentInstructions || branding.bankDetails) ? (
          <View style={styles.compactSection}>
            <Text style={[styles.compactSectionTitle, { color: accent }]}>Payment Information</Text>
            {branding.paymentInstructions ? (
              <Text style={styles.compactSectionText}>{branding.paymentInstructions}</Text>
            ) : null}
            {branding.bankDetails ? (
              <Text style={[styles.compactSectionText, { marginTop: 2 }]}>{branding.bankDetails}</Text>
            ) : null}
          </View>
        ) : null}

        {/* Notes — only if data exists */}
        {invoice.notes ? (
          <View style={styles.compactSection}>
            <Text style={[styles.compactSectionTitle, { color: accent }]}>Notes</Text>
            <Text style={styles.compactSectionText}>{invoice.notes}</Text>
          </View>
        ) : null}

        {/* Footer — just footerText if set */}
        {branding.footerText ? (
          <Text style={styles.footer}>{branding.footerText}</Text>
        ) : null}

      </Page>
    </Document>
  );
}
