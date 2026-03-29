import { useState } from 'react';
import { MessageSquare, Check, Trash2, X } from 'lucide-react';
import {
  useDocComments,
  useCreateDocComment,
  useResolveDocComment,
  useDeleteDocComment,
} from '../hooks/use-doc-comments';
import type { DocumentComment } from '@atlasmail/shared';

interface CommentSidebarProps {
  docId: string;
  isOpen: boolean;
  onClose: () => void;
}

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function CommentSidebar({ docId, isOpen, onClose }: CommentSidebarProps) {
  const { data: comments = [] } = useDocComments(docId);
  const createComment = useCreateDocComment();
  const resolveComment = useResolveDocComment();
  const deleteComment = useDeleteDocComment();
  const [newComment, setNewComment] = useState('');
  const [showResolved, setShowResolved] = useState(false);

  const activeComments = comments.filter((c: DocumentComment) => !c.isResolved && !c.parentId);
  const resolvedComments = comments.filter((c: DocumentComment) => c.isResolved && !c.parentId);
  const displayComments = showResolved ? [...activeComments, ...resolvedComments] : activeComments;

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    createComment.mutate({ docId, content: newComment.trim() });
    setNewComment('');
  };

  if (!isOpen) return null;

  return (
    <div className="w-72 border-l border-gray-200 bg-white flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100">
        <div className="flex items-center gap-1.5">
          <MessageSquare className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-900">Comments</span>
          {activeComments.length > 0 && (
            <span className="text-xs text-gray-400">({activeComments.length})</span>
          )}
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* New comment input */}
      <div className="px-3 py-2 border-b border-gray-100">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="w-full text-sm px-2.5 py-2 border border-gray-200 rounded-md resize-none focus:outline-none focus:border-blue-400"
          rows={2}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit();
          }}
        />
        {newComment.trim() && (
          <div className="flex justify-end mt-1.5">
            <button
              onClick={handleSubmit}
              className="px-2.5 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded cursor-pointer"
            >
              Comment
            </button>
          </div>
        )}
      </div>

      {/* Comment list */}
      <div className="flex-1 overflow-y-auto">
        {displayComments.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-400">
            No comments yet
          </div>
        ) : (
          displayComments.map((comment: DocumentComment) => (
            <div
              key={comment.id}
              className={`px-3 py-2.5 border-b border-gray-50 ${comment.isResolved ? 'opacity-50' : ''}`}
            >
              {comment.selectionText && (
                <div className="text-xs text-gray-400 bg-yellow-50 px-2 py-1 rounded mb-1.5 italic border-l-2 border-yellow-300">
                  &ldquo;{comment.selectionText}&rdquo;
                </div>
              )}
              <p className="text-sm text-gray-700">{comment.content}</p>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[10px] text-gray-400">{getRelativeTime(comment.createdAt)}</span>
                <div className="flex items-center gap-1">
                  {!comment.isResolved && (
                    <button
                      onClick={() => resolveComment.mutate({ commentId: comment.id, docId })}
                      className="text-gray-300 hover:text-green-500 cursor-pointer"
                      title="Resolve"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteComment.mutate({ commentId: comment.id, docId })}
                    className="text-gray-300 hover:text-red-400 cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Show resolved toggle */}
      {resolvedComments.length > 0 && (
        <div className="px-3 py-2 border-t border-gray-100">
          <button
            onClick={() => setShowResolved(!showResolved)}
            className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
          >
            {showResolved ? 'Hide' : 'Show'} {resolvedComments.length} resolved
          </button>
        </div>
      )}
    </div>
  );
}
