import { exportToBlob } from '@excalidraw/excalidraw';
import type { Drawing } from '@atlasmail/shared';
import type { DrawSortOrder } from '../settings-store';

export function sortDrawings(drawings: Drawing[], order: DrawSortOrder): Drawing[] {
  const sorted = [...drawings];
  switch (order) {
    case 'name':
      sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      break;
    case 'created':
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      break;
    case 'modified':
    default:
      sorted.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      break;
  }
  return sorted;
}

// Keys of AppState we persist (not UI-related state)
export const PERSISTED_APP_STATE_KEYS = [
  'viewBackgroundColor',
  'currentItemFontFamily',
  'currentItemFontSize',
  'currentItemStrokeColor',
  'currentItemBackgroundColor',
  'currentItemFillStyle',
  'currentItemStrokeWidth',
  'currentItemRoughness',
  'currentItemOpacity',
  'currentItemEndArrowhead',
  'currentItemStartArrowhead',
  'gridSize',
  'gridStep',
  'gridModeEnabled',
  'objectsSnapModeEnabled',
] as const;

export function pickAppState(appState: Record<string, unknown>): Record<string, unknown> {
  const picked: Record<string, unknown> = {};
  for (const key of PERSISTED_APP_STATE_KEYS) {
    if (key in appState) {
      picked[key] = appState[key];
    }
  }
  return picked;
}

export const THUMBNAIL_DEBOUNCE_MS = 10_000;

export async function generateThumbnailDataUrl(
  elements: readonly unknown[],
  appState: Record<string, unknown>,
  files: unknown,
): Promise<string | null> {
  try {
    const visible = (elements as any[]).filter((el) => !el.isDeleted);
    if (visible.length === 0) return null;

    const blob = await exportToBlob({
      elements: visible,
      appState: {
        ...appState,
        exportBackground: true,
        exportWithDarkMode: false,
      },
      files: files as any,
      maxWidthOrHeight: 200,
    } as any);

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
