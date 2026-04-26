import type { TourConfig } from './tour-types';
import { ListIllustration } from './illustrations/list-illustration';
import { KanbanIllustration } from './illustrations/kanban-illustration';
import { ActivityIllustration } from './illustrations/activity-illustration';

export function TourIllustration({ config }: { config: TourConfig }) {
  switch (config.variant) {
    case 'list':
      return <ListIllustration data={config.illustrationData} />;
    case 'kanban':
      return <KanbanIllustration data={config.illustrationData} />;
    case 'activity':
      return <ActivityIllustration data={config.illustrationData} />;
    case 'custom': {
      const Custom = config.component;
      return <Custom />;
    }
  }
}
