/**
 * Types for the Marketplace app catalog manifests and installed apps.
 */

export interface MarketplaceServiceDef {
  image: string;
  port?: number;
  healthCheck?: string;
  env?: Record<string, string>;
  volumes?: string[];
  dependsOn?: string[];
}

export interface MarketplaceManifest {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  color: string;
  website: string;
  license: string;
  defaultCredentials?: { username: string; password: string };
  services: Record<string, MarketplaceServiceDef>;
  userEnv: Array<{
    key: string;
    label: string;
    required?: boolean;
    default?: string;
  }>;
  resources: {
    minRam: string;
    estimatedDisk: string;
  };
}

export interface MarketplaceAppRecord {
  id: string;
  accountId: string;
  appId: string;
  status: string;
  assignedPort: number;
  containerIds: string[] | null;
  imageDigest: string | null;
  latestDigest: string | null;
  generatedSecrets: string | null;
  envOverrides: Record<string, string> | null;
  installedAt: Date;
  updatedAt: Date;
}
