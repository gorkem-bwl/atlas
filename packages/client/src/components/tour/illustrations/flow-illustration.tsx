import { useTranslation } from 'react-i18next';
import type { FlowData } from '../tour-types';
import { hexToRgba } from '../../../lib/color-themes';

/**
 * The customer lifecycle as one picture: which app owns each stage, and the
 * order they happen in.
 *
 * Every other tour illustration shows a single app's UI. This one exists
 * because the gap reported in #25 is not "what is CRM?" — each app already
 * answers that — but "how do these fit together?". A customer moves
 * lead → deal → project → invoice across three apps, and nothing said so.
 *
 * Stages are colour-keyed to the dock icons they refer to, so the reader can
 * map each row back to something they can actually click.
 */
export function FlowIllustration({ data }: { data: FlowData }) {
  const { t } = useTranslation();

  return (
    <div className="tour-illust tour-illust--flow">
      {data.stages.map((stage, index) => (
        <div key={stage.appId + stage.labelKey} className="tour-illust-flow-stage">
          <div className="tour-illust-flow-marker">
            <span
              className="tour-illust-flow-dot"
              style={{
                background: stage.color,
                boxShadow: `0 0 0 3px ${hexToRgba(stage.color, 0.18)}`,
              }}
            />
            {/* The connector is what makes this a flow rather than a list, so
                it is drawn between stages and omitted after the last one. */}
            {index < data.stages.length - 1 && (
              <span className="tour-illust-flow-connector" />
            )}
          </div>

          <div className="tour-illust-flow-text">
            <div className="tour-illust-flow-label">{t(stage.labelKey)}</div>
            <div className="tour-illust-flow-hint">{t(stage.hintKey)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
