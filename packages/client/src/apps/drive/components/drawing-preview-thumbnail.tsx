import { useState, useRef, useEffect } from 'react';

export function DrawingPreviewThumbnail({ content }: { content: Record<string, unknown> | null }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!content || !containerRef.current) return;
    const elements = Array.isArray((content as any).elements) ? (content as any).elements : [];
    if (elements.length === 0) {
      setError(true);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const { exportToSvg } = await import('@excalidraw/excalidraw');
        const appState = (content as any).appState || {};
        const files = (content as any).files || {};
        const svg = await exportToSvg({
          elements,
          appState: { ...appState, exportBackground: true, viewBackgroundColor: appState.viewBackgroundColor || '#ffffff' },
          files,
        });
        if (cancelled || !containerRef.current) return;
        svg.style.width = '100%';
        svg.style.height = 'auto';
        svg.style.maxHeight = '300px';
        svg.style.display = 'block';
        // Clear existing children safely
        while (containerRef.current.firstChild) {
          containerRef.current.removeChild(containerRef.current.firstChild);
        }
        containerRef.current.appendChild(svg);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => { cancelled = true; };
  }, [content]);

  if (error || !content) {
    return (
      <div className="drive-preview-icon" style={{ gap: 8, padding: 24 }}>
        <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>(empty canvas)</span>
      </div>
    );
  }

  return <div ref={containerRef} style={{ padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 100 }} />;
}
