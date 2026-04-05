import Docker from 'dockerode';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import { logger } from '../../utils/logger';

const execFileRaw = promisify(execFileCb);
function execFile(cmd: string, args: string[], opts?: Record<string, unknown>) {
  return execFileRaw(cmd, args, { maxBuffer: 10 * 1024 * 1024, ...opts });
}

// Docker client — connects to local socket
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

// ─── Docker Availability ───────────────────────────────────────────

/**
 * Check if Docker daemon is reachable.
 */
export async function isDockerAvailable(): Promise<boolean> {
  try {
    await docker.ping();
    return true;
  } catch {
    return false;
  }
}

/**
 * Get Docker version info.
 */
export async function getDockerVersion(): Promise<{ version: string; apiVersion: string } | null> {
  try {
    const info = await docker.version();
    return {
      version: info.Version ?? 'unknown',
      apiVersion: info.ApiVersion ?? 'unknown',
    };
  } catch {
    return null;
  }
}

// ─── System Resource Check ─────────────────────────────────────────

export interface SystemResources {
  totalMemoryMB: number;
  freeMemoryMB: number;
  diskFreeMB: number;
  diskTotalMB: number;
}

/**
 * Check available system resources (memory + disk).
 */
export async function getSystemResources(): Promise<SystemResources> {
  const os = await import('node:os');
  const totalMemoryMB = Math.round(os.totalmem() / (1024 * 1024));
  const freeMemoryMB = Math.round(os.freemem() / (1024 * 1024));

  let diskFreeMB = 0;
  let diskTotalMB = 0;
  try {
    const { stdout } = await execFile('df', ['-m', '/']);
    const lines = stdout.trim().split('\n');
    if (lines.length >= 2) {
      const parts = lines[1].split(/\s+/);
      diskTotalMB = parseInt(parts[1], 10) || 0;
      diskFreeMB = parseInt(parts[3], 10) || 0;
    }
  } catch { /* ignore */ }

  return { totalMemoryMB, freeMemoryMB, diskFreeMB, diskTotalMB };
}

/**
 * Check if system has enough resources for an app.
 * Returns warnings (non-blocking) if resources are low.
 */
export function checkResources(
  resources: { minRam: string; estimatedDisk: string },
  system: SystemResources,
): string[] {
  const warnings: string[] = [];
  const requiredRamMB = parseInt(resources.minRam, 10) || 0;
  const requiredDiskMB = parseInt(resources.estimatedDisk, 10) * (resources.estimatedDisk.includes('GB') ? 1024 : 1) || 0;

  if (requiredRamMB > 0 && system.freeMemoryMB < requiredRamMB) {
    warnings.push(`Low memory: ${system.freeMemoryMB}MB free, app needs ${resources.minRam}`);
  }
  if (requiredDiskMB > 0 && system.diskFreeMB < requiredDiskMB) {
    warnings.push(`Low disk: ${Math.round(system.diskFreeMB / 1024)}GB free, app needs ${resources.estimatedDisk}`);
  }
  return warnings;
}

// ─── Compose Operations (via execFile) ─────────────────────────────

/**
 * Deploy an app: write compose file to disk, run `docker compose up -d`.
 */
export async function deploy(
  appId: string,
  composeContent: string,
  appDir: string,
): Promise<{ stdout: string; stderr: string }> {
  const composeFile = path.join(appDir, 'docker-compose.yml');

  // Ensure directory exists
  if (!fs.existsSync(appDir)) {
    fs.mkdirSync(appDir, { recursive: true });
  }

  // Write compose file
  fs.writeFileSync(composeFile, composeContent, 'utf-8');
  logger.info({ appId, composeFile }, 'Wrote docker-compose.yml');

  // Run docker compose up
  const result = await execFile('docker', [
    'compose',
    '-f', composeFile,
    'up', '-d',
  ], { timeout: 300_000 }); // 5 minute timeout for image pulls

  logger.info({ appId, stdout: result.stdout, stderr: result.stderr }, 'Docker compose up completed');
  return result;
}

/**
 * Stop a running app's containers.
 */
export async function stop(appId: string, appDir: string): Promise<void> {
  const composeFile = path.join(appDir, 'docker-compose.yml');

  if (!fs.existsSync(composeFile)) {
    throw new Error(`No compose file found for ${appId}`);
  }

  const result = await execFile('docker', [
    'compose',
    '-f', composeFile,
    'stop',
  ], { timeout: 60_000 });

  logger.info({ appId, stdout: result.stdout, stderr: result.stderr }, 'Docker compose stop completed');
}

/**
 * Start a stopped app's containers.
 */
export async function start(appId: string, appDir: string): Promise<void> {
  const composeFile = path.join(appDir, 'docker-compose.yml');

  if (!fs.existsSync(composeFile)) {
    throw new Error(`No compose file found for ${appId}`);
  }

  const result = await execFile('docker', [
    'compose',
    '-f', composeFile,
    'start',
  ], { timeout: 60_000 });

  logger.info({ appId, stdout: result.stdout, stderr: result.stderr }, 'Docker compose start completed');
}

/**
 * Update an app: pull latest images then recreate containers.
 */
export async function update(appId: string, appDir: string): Promise<void> {
  const composeFile = path.join(appDir, 'docker-compose.yml');

  if (!fs.existsSync(composeFile)) {
    throw new Error(`No compose file found for ${appId}`);
  }

  // Pull latest images
  const pullResult = await execFile('docker', [
    'compose',
    '-f', composeFile,
    'pull',
  ], { timeout: 300_000 });

  logger.info({ appId, stdout: pullResult.stdout, stderr: pullResult.stderr }, 'Docker compose pull completed');

  // Recreate containers with new images
  const upResult = await execFile('docker', [
    'compose',
    '-f', composeFile,
    'up', '-d',
  ], { timeout: 120_000 });

  logger.info({ appId, stdout: upResult.stdout, stderr: upResult.stderr }, 'Docker compose up (update) completed');
}

/**
 * Remove an app: stop containers, remove containers and volumes.
 */
export async function remove(appId: string, appDir: string): Promise<void> {
  const composeFile = path.join(appDir, 'docker-compose.yml');

  if (!fs.existsSync(composeFile)) {
    logger.warn({ appId }, 'No compose file found, skipping docker compose down');
    return;
  }

  const result = await execFile('docker', [
    'compose',
    '-f', composeFile,
    'down', '-v',
  ], { timeout: 120_000 });

  logger.info({ appId, stdout: result.stdout, stderr: result.stderr }, 'Docker compose down completed');

  // Clean up compose file
  try {
    fs.unlinkSync(composeFile);
    // Try to remove the directory if empty
    const remaining = fs.readdirSync(appDir);
    if (remaining.length === 0) {
      fs.rmdirSync(appDir);
    }
  } catch {
    // Non-critical cleanup
  }
}

// ─── Container Inspection (via dockerode) ──────────────────────────

export interface ContainerStatus {
  id: string;
  name: string;
  state: string;
  health?: string;
  image: string;
  ports: Array<{ hostPort: number; containerPort: number }>;
}

/**
 * Get status of containers by their IDs.
 */
export async function getContainerStatus(containerIds: string[]): Promise<ContainerStatus[]> {
  const statuses: ContainerStatus[] = [];

  for (const id of containerIds) {
    try {
      const container = docker.getContainer(id);
      const info = await container.inspect();

      const ports: Array<{ hostPort: number; containerPort: number }> = [];
      const portBindings = info.HostConfig?.PortBindings ?? {};
      for (const [containerPort, bindings] of Object.entries(portBindings)) {
        if (bindings && Array.isArray(bindings)) {
          for (const binding of bindings as Array<{ HostIp?: string; HostPort?: string }>) {
            ports.push({
              hostPort: parseInt(binding.HostPort ?? '0', 10),
              containerPort: parseInt(containerPort, 10),
            });
          }
        }
      }

      statuses.push({
        id: info.Id,
        name: info.Name.replace(/^\//, ''),
        state: info.State?.Status ?? 'unknown',
        health: info.State?.Health?.Status,
        image: info.Config?.Image ?? 'unknown',
        ports,
      });
    } catch (err) {
      logger.warn({ err, containerId: id }, 'Failed to inspect container');
      statuses.push({
        id,
        name: 'unknown',
        state: 'not_found',
        image: 'unknown',
        ports: [],
      });
    }
  }

  return statuses;
}

/**
 * Get the last N lines of logs from a container.
 */
export async function getContainerLogs(
  containerId: string,
  lines: number = 100,
): Promise<string> {
  try {
    const container = docker.getContainer(containerId);
    const logBuffer = await container.logs({
      stdout: true,
      stderr: true,
      tail: lines,
      timestamps: true,
    });

    // Docker logs can return a Buffer or a readable stream
    if (Buffer.isBuffer(logBuffer)) {
      return stripDockerHeaders(logBuffer);
    }

    // If it's a stream, collect it
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      (logBuffer as NodeJS.ReadableStream).on('data', (chunk: Buffer) => chunks.push(chunk));
      (logBuffer as NodeJS.ReadableStream).on('end', () => resolve(stripDockerHeaders(Buffer.concat(chunks))));
      (logBuffer as NodeJS.ReadableStream).on('error', reject);
    });
  } catch (err) {
    logger.error({ err, containerId }, 'Failed to get container logs');
    return '';
  }
}

/**
 * Strip Docker multiplexed stream headers from log output.
 * Docker prefixes each log frame with an 8-byte header.
 */
function stripDockerHeaders(buffer: Buffer): string {
  const lines: string[] = [];
  let offset = 0;

  while (offset < buffer.length) {
    if (offset + 8 > buffer.length) {
      // Remaining bytes are partial header, treat as raw text
      lines.push(buffer.subarray(offset).toString('utf8'));
      break;
    }

    const frameSize = buffer.readUInt32BE(offset + 4);

    if (offset + 8 + frameSize > buffer.length) {
      // Frame extends beyond buffer, take what we have
      lines.push(buffer.subarray(offset + 8).toString('utf8'));
      break;
    }

    lines.push(buffer.subarray(offset + 8, offset + 8 + frameSize).toString('utf8'));
    offset += 8 + frameSize;
  }

  return lines.join('');
}

/**
 * Check the health of a deployed app by fetching its health endpoint.
 */
export async function checkHealth(
  port: number,
  healthPath: string,
): Promise<{ ok: boolean; status?: number; error?: string }> {
  try {
    const url = `http://localhost:${port}${healthPath}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      return {
        ok: response.ok,
        status: response.status,
      };
    } catch (err: unknown) {
      clearTimeout(timeout);
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, error: message };
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

/**
 * List running containers that belong to an Atlas marketplace app.
 * Uses label filtering based on docker compose project name.
 */
export async function listAppContainers(appId: string): Promise<string[]> {
  try {
    const containers = await docker.listContainers({
      all: true,
      filters: {
        label: [`com.docker.compose.project=atlas_${appId}`],
      },
    });
    return containers.map(c => c.Id);
  } catch (err) {
    logger.error({ err, appId }, 'Failed to list app containers');
    return [];
  }
}
