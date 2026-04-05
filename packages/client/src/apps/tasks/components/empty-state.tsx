import { Inbox, Star, Calendar, Coffee, CircleDot, BookOpen, Archive, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { NavSection } from '../lib/constants';
import { FeatureEmptyState } from '../../../components/ui/feature-empty-state';

export function TasksEmptyState({
  section,
  seeding,
  onSeed,
}: {
  section: NavSection;
  seeding: boolean;
  onSeed: () => void;
}) {
  const { t } = useTranslation();
  const isProject = section.startsWith('project:');

  // For inbox section with no tasks, show rich empty state
  if (section === 'inbox') {
    return (
      <FeatureEmptyState
        illustration="tasks"
        title={t('tasks.empty.inboxTitle')}
        description={t('tasks.empty.inboxDesc')}
        highlights={[
          { icon: <Inbox size={14} />, title: t('tasks.empty.inboxH1Title'), description: t('tasks.empty.inboxH1Desc') },
          { icon: <Star size={14} />, title: t('tasks.empty.inboxH2Title'), description: t('tasks.empty.inboxH2Desc') },
          { icon: <Calendar size={14} />, title: t('tasks.empty.inboxH3Title'), description: t('tasks.empty.inboxH3Desc') },
        ]}
        actionLabel={seeding ? t('common.loading') : t('tasks.empty.loadSample')}
        actionIcon={<Plus size={14} />}
        onAction={onSeed}
      />
    );
  }

  // For other sections, keep simple empty states
  const config: Record<string, { icon: typeof Inbox; title: string; desc: string }> = {
    today: { icon: Star, title: t('tasks.empty.todayTitle'), desc: t('tasks.empty.todayDesc') },
    upcoming: { icon: Calendar, title: t('tasks.empty.upcomingTitle'), desc: t('tasks.empty.upcomingDesc') },
    anytime: { icon: CircleDot, title: t('tasks.empty.anytimeTitle'), desc: t('tasks.empty.anytimeDesc') },
    someday: { icon: Coffee, title: t('tasks.empty.somedayTitle'), desc: t('tasks.empty.somedayDesc') },
    logbook: { icon: BookOpen, title: t('tasks.empty.logbookTitle'), desc: t('tasks.empty.logbookDesc') },
  };

  const cfg = isProject
    ? { icon: Archive, title: t('tasks.empty.projectTitle'), desc: t('tasks.empty.projectDesc') }
    : config[section] ?? { icon: Inbox, title: t('tasks.noTasks'), desc: '' };

  const Icon = cfg.icon;

  return (
    <div className="task-empty-state">
      <Icon size={32} color="var(--color-text-tertiary)" strokeWidth={1.2} />
      <span className="task-empty-title">{cfg.title}</span>
      <span className="task-empty-desc">{cfg.desc}</span>
    </div>
  );
}
