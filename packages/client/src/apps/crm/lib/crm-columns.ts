import type { CrmDealStage } from '../hooks';
import type { FilterColumn } from '../components/filter-bar';

// ─── Column definitions for filtering ─────────────────────────────

export function getDealsFilterColumns(stages: CrmDealStage[], t: (key: string) => string): FilterColumn[] {
  return [
    { key: 'title', label: t('crm.deals.title'), type: 'text' },
    { key: 'companyName', label: t('crm.deals.company'), type: 'text' },
    { key: 'contactName', label: t('crm.deals.contact'), type: 'text' },
    { key: 'value', label: t('crm.deals.value'), type: 'number' },
    { key: 'stageName', label: t('crm.deals.stage'), type: 'select', options: stages.map((s) => ({ value: s.name, label: s.name })) },
    { key: 'expectedCloseDate', label: t('crm.deals.closeDate'), type: 'date' },
  ];
}

export function getContactsFilterColumns(t: (key: string) => string): FilterColumn[] {
  return [
    { key: 'name', label: t('crm.contacts.name'), type: 'text' },
    { key: 'email', label: t('crm.contacts.email'), type: 'text' },
    { key: 'phone', label: t('crm.contacts.phone'), type: 'text' },
    { key: 'companyName', label: t('crm.deals.company'), type: 'text' },
    { key: 'position', label: t('crm.contacts.position'), type: 'text' },
  ];
}

export function getCompaniesFilterColumns(t: (key: string) => string): FilterColumn[] {
  return [
    { key: 'name', label: t('crm.companies.name'), type: 'text' },
    { key: 'domain', label: t('crm.companies.domain'), type: 'text' },
    { key: 'industry', label: t('crm.companies.industry'), type: 'text' },
    { key: 'size', label: t('crm.companies.size'), type: 'text' },
  ];
}

// CSV export column configs (built with t)
export function getDealsCsvColumns(t: (key: string) => string) {
  return [
    { key: 'title', label: t('crm.deals.title') },
    { key: 'value', label: t('crm.deals.value') },
    { key: 'stageName', label: t('crm.deals.stage') },
    { key: 'companyName', label: t('crm.deals.company') },
    { key: 'contactName', label: t('crm.deals.contact') },
    { key: 'probability', label: t('crm.deals.probability') },
    { key: 'expectedCloseDate', label: t('crm.deals.closeDate') },
  ];
}

export function getContactsCsvColumns(t: (key: string) => string) {
  return [
    { key: 'name', label: t('crm.contacts.name') },
    { key: 'email', label: t('crm.contacts.email') },
    { key: 'phone', label: t('crm.contacts.phone') },
    { key: 'companyName', label: t('crm.deals.company') },
    { key: 'position', label: t('crm.contacts.position') },
    { key: 'source', label: t('crm.contacts.source') },
  ];
}

export function getCompaniesCsvColumns(t: (key: string) => string) {
  return [
    { key: 'name', label: t('crm.companies.name') },
    { key: 'domain', label: t('crm.companies.domain') },
    { key: 'industry', label: t('crm.companies.industry') },
    { key: 'size', label: t('crm.companies.size') },
    { key: 'address', label: t('crm.companies.address') },
    { key: 'phone', label: t('crm.contacts.phone') },
  ];
}

// CSV import field configs (built with t)
export function getDealsImportFields(t: (key: string) => string) {
  return [
    { key: 'title', label: t('crm.deals.title'), required: true },
    { key: 'value', label: t('crm.deals.value') },
    { key: 'stage', label: t('crm.deals.stage') },
    { key: 'probability', label: t('crm.deals.probability') },
    { key: 'expectedCloseDate', label: t('crm.deals.closeDate') },
  ];
}

export function getContactsImportFields(t: (key: string) => string) {
  return [
    { key: 'name', label: t('crm.contacts.name'), required: true },
    { key: 'email', label: t('crm.contacts.email') },
    { key: 'phone', label: t('crm.contacts.phone') },
    { key: 'position', label: t('crm.contacts.position') },
    { key: 'source', label: t('crm.contacts.source') },
  ];
}

export function getCompaniesImportFields(t: (key: string) => string) {
  return [
    { key: 'name', label: t('crm.companies.name'), required: true },
    { key: 'domain', label: t('crm.companies.domain') },
    { key: 'industry', label: t('crm.companies.industry') },
    { key: 'size', label: t('crm.companies.size') },
    { key: 'address', label: t('crm.companies.address') },
    { key: 'phone', label: t('crm.contacts.phone') },
  ];
}
