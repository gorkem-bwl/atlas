import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, Clock, FolderKanban, Users, FileText, BarChart3, Settings2,
  Plus, Search, X,
} from 'lucide-react';
import {
  useProjects, useClients, useInvoices,
  type Invoice,
} from './hooks';
import { TimeTracker } from './components/time-tracker';
import { ReportsView } from './components/reports-view';
import { InvoiceBuilder } from './components/invoice-builder';
import { AppSidebar, SidebarSection, SidebarItem } from '../../components/layout/app-sidebar';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { IconButton } from '../../components/ui/icon-button';
import { ContentArea } from '../../components/ui/content-area';
import { useUIStore } from '../../stores/ui-store';
import '../../styles/projects.css';

import type { ActiveView } from './lib/types';
import {
  DashboardView, ProjectsListView, ProjectDetailPanel,
  ClientsListView, ClientDetailPanel,
  InvoicesListView, InvoiceDetailPanel,
  SettingsView,
} from './components/views';
import { CreateProjectModal, CreateClientModal } from './components/modals';

// ─── Main Page ────────────────────────────────────────────────────

export function ProjectsPage() {
  const { t } = useTranslation();
  const { openSettings } = useUIStore();

  // Navigation
  const [searchParams, setSearchParams] = useSearchParams();
  const viewParam = (searchParams.get('view') || 'dashboard') as ActiveView;
  const activeView = viewParam;
  const setActiveView = useCallback((view: ActiveView) => {
    setSearchParams({ view }, { replace: true });
  }, [setSearchParams]);

  // Selection state
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Modals
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [showInvoiceBuilder, setShowInvoiceBuilder] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  // Data
  const { data: projectsData } = useProjects();
  const projects = projectsData?.projects ?? [];

  const { data: clientsData } = useClients();
  const clients = clientsData?.clients ?? [];

  const { data: invoicesData } = useInvoices();
  const invoices = invoicesData?.invoices ?? [];

  // Selected entities
  const selectedProject = selectedProjectId ? projects.find((p) => p.id === selectedProjectId) : null;
  const selectedClient = selectedClientId ? clients.find((c) => c.id === selectedClientId) : null;
  const selectedInvoice = selectedInvoiceId ? invoices.find((i) => i.id === selectedInvoiceId) : null;

  // Close selection on view change
  useEffect(() => {
    setSelectedProjectId(null);
    setSelectedClientId(null);
    setSelectedInvoiceId(null);
    setSearchQuery('');
    setShowSearch(false);
  }, [activeView]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (showSearch) {
          setShowSearch(false);
          setSearchQuery('');
        } else {
          setSelectedProjectId(null);
          setSelectedClientId(null);
          setSelectedInvoiceId(null);
        }
      }
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if (e.key === '/' && !isInput) {
        e.preventDefault();
        setShowSearch(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSearch]);

  // Section title
  const sectionTitle = useMemo(() => {
    switch (activeView) {
      case 'dashboard': return t('projects.sidebar.dashboard');
      case 'timeTracking': return t('projects.sidebar.timeTracking');
      case 'projects': return t('projects.sidebar.allProjects');
      case 'clients': return t('projects.sidebar.clients');
      case 'invoices': return t('projects.sidebar.invoices');
      case 'reports': return t('projects.sidebar.reports');
      case 'settings': return t('projects.sidebar.settings');
    }
  }, [activeView, t]);

  // Add handler
  const handleAdd = () => {
    switch (activeView) {
      case 'projects':
        setShowCreateProject(true);
        break;
      case 'clients':
        setShowCreateClient(true);
        break;
      case 'invoices':
        setEditingInvoice(null);
        setShowInvoiceBuilder(true);
        break;
    }
  };

  const addButtonLabel = useMemo(() => {
    switch (activeView) {
      case 'dashboard': return t('projects.projects.newProject');
      case 'projects': return t('projects.projects.newProject');
      case 'clients': return t('projects.clients.newClient');
      case 'invoices': return t('projects.invoices.newInvoice');
      default: return '';
    }
  }, [activeView, t]);

  const hasDetailPanel = !!(
    (activeView === 'projects' && selectedProject) ||
    (activeView === 'clients' && selectedClient) ||
    (activeView === 'invoices' && selectedInvoice)
  );

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <AppSidebar
        storageKey="atlas_projects_sidebar"
        title={t('projects.title')}
        footer={
          <SidebarItem
            label={t('projects.sidebar.settings')}
            icon={<Settings2 size={14} />}
            onClick={() => setActiveView('settings')}
          />
        }
      >
        <SidebarSection>
          <SidebarItem
            label={t('projects.sidebar.dashboard')}
            icon={<LayoutDashboard size={14} />}
            iconColor="#0ea5e9"
            isActive={activeView === 'dashboard'}
            onClick={() => setActiveView('dashboard')}
          />
          <SidebarItem
            label={t('projects.sidebar.timeTracking')}
            icon={<Clock size={14} />}
            iconColor="#f59e0b"
            isActive={activeView === 'timeTracking'}
            onClick={() => setActiveView('timeTracking')}
          />
          <SidebarItem
            label={t('projects.sidebar.allProjects')}
            icon={<FolderKanban size={14} />}
            iconColor="#8b5cf6"
            isActive={activeView === 'projects'}
            count={projects.length}
            onClick={() => setActiveView('projects')}
          />
          <SidebarItem
            label={t('projects.sidebar.clients')}
            icon={<Users size={14} />}
            iconColor="#10b981"
            isActive={activeView === 'clients'}
            count={clients.length}
            onClick={() => setActiveView('clients')}
          />
          <SidebarItem
            label={t('projects.sidebar.invoices')}
            icon={<FileText size={14} />}
            iconColor="#3b82f6"
            isActive={activeView === 'invoices'}
            count={invoices.length}
            onClick={() => setActiveView('invoices')}
          />
          <SidebarItem
            label={t('projects.sidebar.reports')}
            icon={<BarChart3 size={14} />}
            iconColor="#6366f1"
            isActive={activeView === 'reports'}
            onClick={() => setActiveView('reports')}
          />
        </SidebarSection>
      </AppSidebar>

      {/* Main content */}
      <ContentArea
        title={sectionTitle ?? ''}
        actions={
          activeView !== 'dashboard' && activeView !== 'timeTracking' && activeView !== 'reports' && activeView !== 'settings' ? (
            <>
              <IconButton
                icon={<Search size={14} />}
                label={t('projects.actions.search')}
                size={28}
                active={showSearch}
                onClick={() => {
                  setShowSearch(!showSearch);
                  if (!showSearch) setTimeout(() => searchInputRef.current?.focus(), 50);
                }}
              />
              {addButtonLabel && (
                <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={handleAdd}>
                  {addButtonLabel}
                </Button>
              )}
            </>
          ) : activeView === 'dashboard' ? (
            <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => { setActiveView('projects'); setShowCreateProject(true); }}>
              {t('projects.projects.newProject')}
            </Button>
          ) : undefined
        }
      >
        {/* Search bar */}
        {showSearch && (
          <div className="projects-search-bar">
            <Input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('projects.actions.search')}
              iconLeft={<Search size={14} />}
              size="sm"
              style={{ border: 'none', background: 'transparent' }}
            />
            <IconButton
              icon={<X size={14} />}
              label={t('common.close')}
              size={24}
              onClick={() => { setShowSearch(false); setSearchQuery(''); }}
            />
          </div>
        )}

        {/* Content area */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {activeView === 'dashboard' && <DashboardView />}

            {activeView === 'timeTracking' && <TimeTracker />}

            {activeView === 'projects' && (
              <ProjectsListView
                projects={projects}
                searchQuery={searchQuery}
                selectedId={selectedProjectId}
                onSelect={(id) => { setSelectedProjectId(id); setSelectedClientId(null); setSelectedInvoiceId(null); }}
                onAdd={() => setShowCreateProject(true)}
                clients={clients}
              />
            )}

            {activeView === 'clients' && (
              <ClientsListView
                clients={clients}
                searchQuery={searchQuery}
                selectedId={selectedClientId}
                onSelect={(id) => { setSelectedClientId(id); setSelectedProjectId(null); setSelectedInvoiceId(null); }}
                onAdd={() => setShowCreateClient(true)}
              />
            )}

            {activeView === 'invoices' && (
              <InvoicesListView
                invoices={invoices}
                searchQuery={searchQuery}
                selectedId={selectedInvoiceId}
                onSelect={(id) => { setSelectedInvoiceId(id); setSelectedProjectId(null); setSelectedClientId(null); }}
                onAdd={() => { setEditingInvoice(null); setShowInvoiceBuilder(true); }}
              />
            )}

            {activeView === 'reports' && <ReportsView />}

            {activeView === 'settings' && <SettingsView />}
          </div>

          {/* Detail panels */}
          {hasDetailPanel && (
            <div style={{ width: 360, borderLeft: '1px solid var(--color-border-secondary)', flexShrink: 0, overflow: 'hidden' }}>
              {activeView === 'projects' && selectedProject && (
                <ProjectDetailPanel project={selectedProject} onClose={() => setSelectedProjectId(null)} />
              )}
              {activeView === 'clients' && selectedClient && (
                <ClientDetailPanel
                  client={selectedClient}
                  onClose={() => setSelectedClientId(null)}
                  onNavigate={(view, selectId) => {
                    setActiveView(view);
                    setSelectedClientId(null);
                    if (view === 'projects' && selectId) setSelectedProjectId(selectId);
                    if (view === 'invoices' && selectId) setSelectedInvoiceId(selectId);
                  }}
                />
              )}
              {activeView === 'invoices' && selectedInvoice && (
                <InvoiceDetailPanel
                  invoice={selectedInvoice}
                  onClose={() => setSelectedInvoiceId(null)}
                  onEdit={() => { setEditingInvoice(selectedInvoice); setShowInvoiceBuilder(true); }}
                />
              )}
            </div>
          )}
        </div>
      </ContentArea>

      {/* Modals */}
      <CreateProjectModal open={showCreateProject} onClose={() => setShowCreateProject(false)} clients={clients} />
      <CreateClientModal open={showCreateClient} onClose={() => setShowCreateClient(false)} />
      <InvoiceBuilder open={showInvoiceBuilder} onClose={() => { setShowInvoiceBuilder(false); setEditingInvoice(null); }} invoice={editingInvoice} />
    </div>
  );
}
