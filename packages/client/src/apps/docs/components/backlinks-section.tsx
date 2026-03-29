import { Link2 } from 'lucide-react';
import { useDocBacklinks } from '../hooks/use-doc-comments';
import { useNavigate } from 'react-router-dom';
import type { Backlink } from '@atlasmail/shared';

interface BacklinksSectionProps {
  docId: string;
}

export function BacklinksSection({ docId }: BacklinksSectionProps) {
  const { data: backlinks = [] } = useDocBacklinks(docId);
  const navigate = useNavigate();

  if (backlinks.length === 0) return null;

  return (
    <div className="border-t border-gray-100 px-6 py-4 mt-8">
      <div className="flex items-center gap-1.5 mb-2">
        <Link2 className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          Referenced in {backlinks.length} document{backlinks.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="space-y-1">
        {backlinks.map((bl: Backlink) => (
          <button
            key={bl.id}
            onClick={() => navigate(`/docs/${bl.id}`)}
            className="block w-full text-left px-2 py-1.5 rounded text-sm text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer truncate"
          >
            {bl.title || 'Untitled'}
          </button>
        ))}
      </div>
    </div>
  );
}
