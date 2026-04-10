import React from 'react';
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  pdf,
} from '@react-pdf/renderer';

export interface StarterFieldSpec {
  type: 'signature' | 'date' | 'text';
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  signerEmail: string | null;
  label: string | null;
  required: boolean;
}

export interface StarterTemplate {
  key: string;
  title: string;
  documentType: 'contract' | 'nda' | 'offer_letter';
  pageCount: number;
  render: () => Promise<Buffer>;
  fields: StarterFieldSpec[];
}

const styles = StyleSheet.create({
  page: { padding: 54, fontSize: 11, fontFamily: 'Helvetica' },
  title: { fontSize: 18, marginBottom: 12 },
  disclaimer: {
    fontSize: 9,
    fontStyle: 'italic',
    color: '#666',
    marginBottom: 16,
  },
  heading: { fontSize: 13, marginTop: 12, marginBottom: 6 },
  paragraph: { marginBottom: 10, lineHeight: 1.4 },
  signatureBlock: { marginTop: 40, fontSize: 10, color: '#888' },
  signatureRow: { flexDirection: 'row', justifyContent: 'space-between' },
  signatureCol: { width: 220 },
  // Absolute-positioned footer rows. PDF origin is bottom-left; in react-pdf
  // `bottom` on an absolute view is the distance from the page bottom to the
  // top edge of the element. Field specs place signature rects at y=100..150
  // and date rects at y=60..85, so labels sit just above each field.
  absSignatureRow: {
    position: 'absolute',
    left: 54,
    right: 54,
    bottom: 150,
    fontSize: 10,
    color: '#888',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  absDateRow: {
    position: 'absolute',
    left: 54,
    right: 54,
    bottom: 85,
    fontSize: 10,
    color: '#888',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  absDateRowSingle: {
    position: 'absolute',
    left: 54,
    right: 54,
    bottom: 85,
    fontSize: 10,
    color: '#888',
    flexDirection: 'row',
  },
  footerCol: { width: 220 },
});

const DISCLAIMER =
  'This is a template starting point and not legal advice. Consult a lawyer before using in production.';

async function renderToBuffer(
  doc: React.ReactElement<any>
): Promise<Buffer> {
  const instance = pdf(doc);
  const result = await instance.toBuffer();
  // react-pdf v4 may return a Node Readable stream or a Buffer depending on env.
  if (Buffer.isBuffer(result)) {
    return result;
  }
  const chunks: Buffer[] = [];
  for await (const chunk of result as AsyncIterable<Buffer | Uint8Array>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

// ---------- Shared building blocks ----------

function Disclaimer() {
  return <Text style={styles.disclaimer}>{DISCLAIMER}</Text>;
}

function SignatureFooter({
  leftLabel,
  rightLabel,
}: {
  leftLabel: string;
  rightLabel: string;
}) {
  return (
    <>
      <View style={styles.absSignatureRow}>
        <Text style={styles.footerCol}>{leftLabel}</Text>
        <Text style={styles.footerCol}>{rightLabel}</Text>
      </View>
      <View style={styles.absDateRow}>
        <Text style={styles.footerCol}>Date</Text>
        <Text style={styles.footerCol}>Date</Text>
      </View>
    </>
  );
}

function OfferLetterFooter() {
  return (
    <>
      <View style={styles.absSignatureRow}>
        <Text style={styles.footerCol}>Candidate signature</Text>
        <Text style={styles.footerCol}>
          Acknowledged by [Your company name]
        </Text>
      </View>
      <View style={styles.absDateRowSingle}>
        <Text style={styles.footerCol}>Date</Text>
      </View>
    </>
  );
}

// ---------- Templates ----------

function MutualNdaDoc() {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>Mutual Non-Disclosure Agreement</Text>
        <Disclaimer />
        <Text style={styles.paragraph}>
          This Mutual Non-Disclosure Agreement (the "Agreement") is entered
          into as of [Effective date] by and between [Your company name] and
          [Counterparty name] (each a "Party" and together the "Parties").
        </Text>
        <Text style={styles.paragraph}>
          The Parties wish to explore a potential business relationship and in
          connection with this, each Party may disclose to the other certain
          confidential and proprietary information. The Parties have entered
          into this Agreement to protect such information.
        </Text>
        <Text style={styles.heading}>1. Confidential Information</Text>
        <Text style={styles.paragraph}>
          "Confidential Information" means any non-public information disclosed
          by one Party ("Discloser") to the other ("Recipient"), whether orally
          or in writing, that is designated as confidential or that reasonably
          should be understood to be confidential given the nature of the
          information and the circumstances of disclosure.
        </Text>
        <Text style={styles.heading}>2. Obligations</Text>
        <Text style={styles.paragraph}>
          Recipient agrees to use the same degree of care that it uses to
          protect the confidentiality of its own confidential information, but
          in no event less than reasonable care, and to use Confidential
          Information solely for the purpose of evaluating the potential
          relationship between the Parties.
        </Text>
      </Page>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.heading}>3. Term</Text>
        <Text style={styles.paragraph}>
          This Agreement will remain in effect for two (2) years from the
          Effective date, and the obligations with respect to Confidential
          Information will survive for an additional three (3) years.
        </Text>
        <Text style={styles.heading}>4. Miscellaneous</Text>
        <Text style={styles.paragraph}>
          This Agreement constitutes the entire agreement between the Parties
          regarding the subject matter and supersedes all prior discussions.
          Any amendment must be in writing and signed by both Parties.
        </Text>
        <SignatureFooter
          leftLabel="Signature – [Your company name]"
          rightLabel="Signature – [Counterparty name]"
        />
      </Page>
    </Document>
  );
}

function OneWayNdaDoc() {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>One-Way Non-Disclosure Agreement</Text>
        <Disclaimer />
        <Text style={styles.paragraph}>
          This One-Way Non-Disclosure Agreement (the "Agreement") is entered
          into as of [Effective date] between [Your company name] ("Discloser")
          and [Counterparty name] ("Recipient").
        </Text>
        <Text style={styles.heading}>1. Purpose</Text>
        <Text style={styles.paragraph}>
          Discloser intends to share confidential information with Recipient
          for the purpose of evaluating a possible business relationship.
          Recipient agrees to protect such information in accordance with this
          Agreement.
        </Text>
        <Text style={styles.heading}>2. Confidential Information</Text>
        <Text style={styles.paragraph}>
          "Confidential Information" means any information disclosed by
          Discloser to Recipient, whether orally, in writing, or by inspection
          of tangible objects, which is designated as confidential or would
          reasonably be considered confidential.
        </Text>
      </Page>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.heading}>3. Obligations of Recipient</Text>
        <Text style={styles.paragraph}>
          Recipient shall (a) hold Confidential Information in strict
          confidence, (b) not disclose it to any third party without the prior
          written consent of Discloser, and (c) use it solely for the purpose
          described above.
        </Text>
        <Text style={styles.heading}>4. Term</Text>
        <Text style={styles.paragraph}>
          Recipient's obligations under this Agreement shall continue for a
          period of three (3) years from the Effective date.
        </Text>
        <SignatureFooter
          leftLabel="Signature – [Your company name] (Discloser)"
          rightLabel="Signature – [Counterparty name] (Recipient)"
        />
      </Page>
    </Document>
  );
}

function ConsultingAgreementDoc() {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>Consulting Agreement</Text>
        <Disclaimer />
        <Text style={styles.paragraph}>
          This Consulting Agreement (the "Agreement") is made as of [Effective
          date] between [Your company name] ("Client") and [Counterparty name]
          ("Consultant").
        </Text>
        <Text style={styles.heading}>1. Services</Text>
        <Text style={styles.paragraph}>
          Consultant shall provide the following services to Client: [Scope of
          work]. Consultant will perform the services in a professional and
          workmanlike manner consistent with industry standards.
        </Text>
        <Text style={styles.heading}>2. Compensation</Text>
        <Text style={styles.paragraph}>
          In consideration for the services, Client shall pay Consultant
          [Compensation]. Invoices are due within thirty (30) days of receipt.
        </Text>
      </Page>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.heading}>3. Independent Contractor</Text>
        <Text style={styles.paragraph}>
          Consultant is an independent contractor and not an employee of
          Client. Consultant is responsible for all taxes, insurance, and
          benefits related to Consultant's work.
        </Text>
        <Text style={styles.heading}>4. Confidentiality</Text>
        <Text style={styles.paragraph}>
          Consultant agrees to keep confidential all non-public information of
          Client obtained during the engagement and to use such information
          only for the purpose of performing the services.
        </Text>
        <SignatureFooter
          leftLabel="Signature – [Your company name]"
          rightLabel="Signature – [Counterparty name]"
        />
      </Page>
    </Document>
  );
}

function SimpleSowDoc() {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>Statement of Work</Text>
        <Disclaimer />
        <Text style={styles.paragraph}>
          This Statement of Work ("SOW") is entered into as of [Effective date]
          between [Your company name] and [Counterparty name] and is governed
          by the terms of any applicable master services agreement between the
          parties.
        </Text>
        <Text style={styles.heading}>1. Scope of Work</Text>
        <Text style={styles.paragraph}>
          The services to be provided under this SOW are: [Scope of work]. Any
          changes to the scope must be agreed in writing by both parties.
        </Text>
        <Text style={styles.heading}>2. Deliverables and Timeline</Text>
        <Text style={styles.paragraph}>
          Deliverables will be provided according to the schedule agreed by
          the parties. The engagement begins on [Effective date] and continues
          until the deliverables are accepted.
        </Text>
      </Page>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.heading}>3. Fees</Text>
        <Text style={styles.paragraph}>
          Total fees for the work described in this SOW are [Compensation],
          payable according to the invoicing schedule set out in the governing
          agreement.
        </Text>
        <Text style={styles.heading}>4. Acceptance</Text>
        <Text style={styles.paragraph}>
          Deliverables will be deemed accepted ten (10) business days after
          delivery unless the receiving party provides written notice of
          rejection with reasonable detail.
        </Text>
        <SignatureFooter
          leftLabel="Signature – [Your company name]"
          rightLabel="Signature – [Counterparty name]"
        />
      </Page>
    </Document>
  );
}

function OfferLetterDoc() {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>Offer Letter</Text>
        <Disclaimer />
        <Text style={styles.paragraph}>
          [Your company name] is pleased to offer you the position of
          [Position], with an anticipated start date of [Start date]. You will
          report to [Reporting manager].
        </Text>
        <Text style={styles.paragraph}>
          Your starting compensation will be [Salary], paid according to the
          company's standard payroll schedule. You will also be eligible for
          the company's standard benefits program, subject to the terms of
          each plan.
        </Text>
        <Text style={styles.paragraph}>
          Employment with [Your company name] is at-will, meaning that either
          you or the company may terminate the employment relationship at any
          time, with or without cause and with or without notice, subject to
          applicable law.
        </Text>
        <Text style={styles.paragraph}>
          Please indicate your acceptance of this offer by signing below. We
          look forward to welcoming you to the team.
        </Text>
        <OfferLetterFooter />
      </Page>
    </Document>
  );
}

// ---------- Field specs ----------

const TWO_PARTY_PAGE2_FIELDS: StarterFieldSpec[] = [
  {
    type: 'signature',
    pageNumber: 2,
    x: 72,
    y: 100,
    width: 200,
    height: 50,
    signerEmail: null,
    label: 'Signature – [Your company name]',
    required: true,
  },
  {
    type: 'signature',
    pageNumber: 2,
    x: 340,
    y: 100,
    width: 200,
    height: 50,
    signerEmail: null,
    label: 'Signature – [Counterparty name]',
    required: true,
  },
  {
    type: 'date',
    pageNumber: 2,
    x: 72,
    y: 60,
    width: 200,
    height: 25,
    signerEmail: null,
    label: 'Date',
    required: false,
  },
  {
    type: 'date',
    pageNumber: 2,
    x: 340,
    y: 60,
    width: 200,
    height: 25,
    signerEmail: null,
    label: 'Date',
    required: false,
  },
];

const OFFER_LETTER_FIELDS: StarterFieldSpec[] = [
  {
    type: 'signature',
    pageNumber: 1,
    x: 72,
    y: 100,
    width: 200,
    height: 50,
    signerEmail: null,
    label: 'Candidate signature',
    required: true,
  },
  {
    type: 'signature',
    pageNumber: 1,
    x: 340,
    y: 100,
    width: 200,
    height: 50,
    signerEmail: null,
    label: 'Acknowledged by [Your company name]',
    required: true,
  },
  {
    type: 'date',
    pageNumber: 1,
    x: 72,
    y: 60,
    width: 200,
    height: 25,
    signerEmail: null,
    label: 'Date',
    required: false,
  },
];

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    key: 'mutual_nda',
    title: 'Mutual NDA',
    documentType: 'nda',
    pageCount: 2,
    render: () => renderToBuffer(<MutualNdaDoc />),
    fields: TWO_PARTY_PAGE2_FIELDS,
  },
  {
    key: 'oneway_nda',
    title: 'One-way NDA',
    documentType: 'nda',
    pageCount: 2,
    render: () => renderToBuffer(<OneWayNdaDoc />),
    fields: TWO_PARTY_PAGE2_FIELDS,
  },
  {
    key: 'consulting_agreement',
    title: 'Consulting Agreement',
    documentType: 'contract',
    pageCount: 2,
    render: () => renderToBuffer(<ConsultingAgreementDoc />),
    fields: TWO_PARTY_PAGE2_FIELDS,
  },
  {
    key: 'simple_sow',
    title: 'Simple SOW',
    documentType: 'contract',
    pageCount: 2,
    render: () => renderToBuffer(<SimpleSowDoc />),
    fields: TWO_PARTY_PAGE2_FIELDS,
  },
  {
    key: 'offer_letter',
    title: 'Offer Letter',
    documentType: 'offer_letter',
    pageCount: 1,
    render: () => renderToBuffer(<OfferLetterDoc />),
    fields: OFFER_LETTER_FIELDS,
  },
];
