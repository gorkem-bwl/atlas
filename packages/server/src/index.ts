import { createApp } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';

const app = createApp();

app.listen(env.PORT, () => {
  logger.info(`AtlasMail server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
});
