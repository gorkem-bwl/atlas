import type { Router } from 'express';
import type { AppManifestBase } from '@atlas-platform/shared';

export interface ServerAppManifest extends AppManifestBase {
  /** Express router for this app's API routes */
  router: Router;

  /** API route prefix, e.g. '/docs'. Defaults to `/${id}` */
  routePrefix?: string;

  /** Database table names this app owns */
  tables?: string[];
}
