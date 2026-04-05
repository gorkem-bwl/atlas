import { Router, type Request, type Response } from 'express';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import { adminAuthMiddleware } from '../middleware/admin-auth';
import { logger } from '../utils/logger';

const execFile = promisify(execFileCb);
const router = Router();

// All routes require admin auth
router.use(adminAuthMiddleware);

const WATCHTOWER_URL = process.env.WATCHTOWER_URL || 'http://atlas-watchtower:8080';
const WATCHTOWER_TOKEN = process.env.WATCHTOWER_API_TOKEN || 'atlas-watchtower-token';
const CONTAINER_NAME = 'atlas-watchtower';

/**
 * GET /api/v1/updates/status
 * Check if Watchtower container exists and is running
 */
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const { stdout } = await execFile('docker', ['inspect', '--format', '{{.State.Running}}', CONTAINER_NAME]);
    const isRunning = stdout.trim() === 'true';

    let watchtowerReachable = false;
    if (isRunning) {
      try {
        const response = await fetch(`${WATCHTOWER_URL}/v1/update`, {
          method: 'HEAD',
          headers: { Authorization: `Bearer ${WATCHTOWER_TOKEN}` },
          signal: AbortSignal.timeout(3000),
        });
        watchtowerReachable = response.ok;
      } catch { /* not reachable yet */ }
    }

    res.json({
      success: true,
      data: {
        containerExists: true,
        autoUpdateEnabled: isRunning,
        watchtowerReachable,
      },
    });
  } catch {
    // Container doesn't exist
    res.json({
      success: true,
      data: {
        containerExists: false,
        autoUpdateEnabled: false,
        watchtowerReachable: false,
      },
    });
  }
});

/**
 * POST /api/v1/updates/enable
 * Start the Watchtower container
 */
router.post('/enable', async (_req: Request, res: Response) => {
  try {
    await execFile('docker', ['start', CONTAINER_NAME]);
    // Also set restart policy so it survives reboots
    await execFile('docker', ['update', '--restart', 'unless-stopped', CONTAINER_NAME]);
    logger.info('Auto-update enabled — Watchtower container started');
    res.json({ success: true, data: { autoUpdateEnabled: true } });
  } catch (error: any) {
    logger.error({ error: error?.message }, 'Failed to start Watchtower');
    res.status(500).json({ success: false, error: 'Failed to enable auto-updates. Make sure Docker is available.' });
  }
});

/**
 * POST /api/v1/updates/disable
 * Stop the Watchtower container
 */
router.post('/disable', async (_req: Request, res: Response) => {
  try {
    await execFile('docker', ['stop', CONTAINER_NAME]);
    // Set restart policy to "no" so it doesn't restart on reboot
    await execFile('docker', ['update', '--restart', 'no', CONTAINER_NAME]);
    logger.info('Auto-update disabled — Watchtower container stopped');
    res.json({ success: true, data: { autoUpdateEnabled: false } });
  } catch (error: any) {
    logger.error({ error: error?.message }, 'Failed to stop Watchtower');
    res.status(500).json({ success: false, error: 'Failed to disable auto-updates.' });
  }
});

/**
 * POST /api/v1/updates/check
 * Trigger Watchtower to check for updates now
 */
router.post('/check', async (_req: Request, res: Response) => {
  try {
    const response = await fetch(`${WATCHTOWER_URL}/v1/update`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${WATCHTOWER_TOKEN}` },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      res.status(502).json({ success: false, error: 'Watchtower returned an error' });
      return;
    }

    logger.info('Update check triggered via Watchtower API');
    res.json({ success: true, data: { message: 'Update check triggered' } });
  } catch (error: any) {
    logger.warn({ error: error?.message }, 'Failed to reach Watchtower for update check');
    res.status(503).json({
      success: false,
      error: 'Auto-update service is not running. Enable it from Settings > Updates.',
    });
  }
});

export default router;
