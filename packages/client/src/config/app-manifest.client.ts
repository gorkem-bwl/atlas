import type { ComponentType, CSSProperties, LazyExoticComponent } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { AppManifestBase } from '@atlas-platform/shared';
import type { SettingsCategory } from './settings-registry';

/**
 * Icon component shape used by the manifest. Either a `LucideIcon` (for the
 * vast majority of features) or a custom React component that accepts the
 * same minimal `size`/`className`/`style` props — used by the brand icons
 * in the dockbar (CRM, HRM, Projects, Calendar).
 */
export type AppIconComponent =
  | LucideIcon
  | ComponentType<{ size?: number; className?: string; style?: CSSProperties }>;

export interface AppRoute {
  path: string;
  component: ComponentType | LazyExoticComponent<ComponentType>;
}

// ─── App Widget Types ──────────────────────────────────────────────

export interface AppWidgetProps {
  width: number;
  height: number;
  appId: string;
}

export interface ClientAppWidget {
  /** Unique widget identifier within the app */
  id: string;
  /** Human-readable name */
  name: string;
  /** Short description */
  description: string;
  /** Lucide icon name (string) for server-safe reference */
  iconName: string;
  /** Lucide icon component */
  icon: LucideIcon;
  /** Default grid size: sm=1col, md=2col, lg=full-row */
  defaultSize: 'sm' | 'md' | 'lg';
  /** Auto-refresh interval in ms */
  refreshInterval?: number;
  /** Whether enabled by default */
  defaultEnabled: boolean;
  /** React component to render the widget */
  component: ComponentType<AppWidgetProps>;
}

// ─── Client App Manifest ───────────────────────────────────────────

export interface ClientAppManifest extends AppManifestBase {
  /** Icon component for rendering — either a lucide icon or a custom brand component */
  icon: AppIconComponent;

  /** Client routes this app registers */
  routes: AppRoute[];

  /** Settings panels this app contributes */
  settingsCategory?: SettingsCategory;

  /** Sidebar sort order (lower = higher) */
  sidebarOrder: number;

  /** Client-side widget components this app registers */
  widgets?: ClientAppWidget[];
}
