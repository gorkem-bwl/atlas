import signRouter from './routes';
import type { ServerAppManifest } from '../../config/app-manifest.server';

export const signServerManifest: ServerAppManifest = {
  id: 'sign',
  name: 'Sign',
  labelKey: 'sidebar.sign',
  iconName: 'PenTool',
  color: '#8b5cf6',
  minPlan: 'starter',
  category: 'productivity',
  dependencies: [],
  defaultEnabled: true,
  version: '1.0.0',
  router: signRouter,
  routePrefix: '/sign',
  tables: ['signature_documents', 'signature_fields', 'signing_tokens'],
};
