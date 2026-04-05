import { useState, useEffect, useRef } from 'react';
import type { TaskProject } from '@atlasmail/shared';
import { useUpdateProject } from '../hooks';
import { EmojiPicker } from '../../../components/shared/emoji-picker';

export function ProjectHeader({
  project,
}: {
  project: TaskProject;
}) {
  const updateProject = useUpdateProject();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [desc, setDesc] = useState(project.description || '');
  const descRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDesc(project.description || '');
  }, [project.id, project.description]);

  useEffect(() => {
    if (isEditingDesc && descRef.current) descRef.current.focus();
  }, [isEditingDesc]);

  const handleEmojiSelect = (emoji: string) => {
    updateProject.mutate({ id: project.id, icon: emoji || null });
  };

  const handleDescSave = () => {
    setIsEditingDesc(false);
    updateProject.mutate({ id: project.id, description: desc || null });
  };

  return (
    <div className="task-project-header">
      <div className="task-project-header-top">
        <div className="task-project-emoji-wrapper" style={{ position: 'relative' }}>
          <button
            className="task-project-emoji-btn"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            title="Change icon"
          >
            {project.icon || <div className="tasks-project-indicator large" style={{ background: project.color }} />}
          </button>
          {showEmojiPicker && (
            <EmojiPicker
              onSelect={(emoji) => { handleEmojiSelect(emoji); setShowEmojiPicker(false); }}
              onRemove={() => { handleEmojiSelect(''); setShowEmojiPicker(false); }}
              onClose={() => setShowEmojiPicker(false)}
            />
          )}
        </div>
        <h2 className="task-project-header-title">{project.title}</h2>
      </div>

      {isEditingDesc ? (
        <input
          ref={descRef}
          className="task-project-desc-input"
          value={desc}
          onChange={e => setDesc(e.target.value)}
          onBlur={handleDescSave}
          onKeyDown={e => { if (e.key === 'Enter') handleDescSave(); if (e.key === 'Escape') setIsEditingDesc(false); }}
          placeholder="Add a description..."
        />
      ) : (
        <div
          className="task-project-desc"
          onClick={() => setIsEditingDesc(true)}
        >
          {project.description || <span className="task-project-desc-placeholder">Add a description...</span>}
        </div>
      )}
    </div>
  );
}
