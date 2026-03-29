import { serverAppRegistry } from '../config/app-registry.server';
import { docsServerManifest } from './docs/manifest';
import { drawServerManifest } from './draw/manifest';
import { tasksServerManifest } from './tasks/manifest';
import { tablesServerManifest } from './tables/manifest';
import { driveServerManifest } from './drive/manifest';
import { signServerManifest } from './sign/manifest';

serverAppRegistry.register(docsServerManifest);
serverAppRegistry.register(drawServerManifest);
serverAppRegistry.register(tasksServerManifest);
serverAppRegistry.register(tablesServerManifest);
serverAppRegistry.register(driveServerManifest);
serverAppRegistry.register(signServerManifest);

export { serverAppRegistry };
