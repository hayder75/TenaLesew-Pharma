import React from 'react';
import { useApi } from '../../hooks/useApi';
import { apiGet } from '../../lib/api';
import { dateTimeStr } from '../../lib/format';
import { Chip, EmptyState } from '../../components/ui';
import { ScrollText } from 'lucide-react';

interface AuditRow {
  id: string;
  action: string;
  actorLabel?: string | null;
  entityType?: string | null;
  detail?: unknown;
  createdAt: string;
}

const actionTone = (action: string): 'mint' | 'blush' | 'sun' | 'sky' | 'neutral' => {
  if (action.includes('suspend') || action.includes('revok')) return 'blush';
  if (action.includes('created') || action.includes('issued') || action.includes('reactivat')) return 'mint';
  if (action.includes('impersonate')) return 'sun';
  if (action.includes('license')) return 'sky';
  return 'neutral';
};

const Audit: React.FC = () => {
  const { data: logs, loading } = useApi<AuditRow[]>(() => apiGet('/platform/audit'), []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[26px] font-extrabold tracking-tight text-ink">Audit log</h1>
        <p className="text-sm text-stone-500 mt-0.5">Every platform-level action, append-only</p>
      </div>

      {loading && <div className="card p-8 text-center text-stone-400">Loading…</div>}

      <div className="card divide-y divide-cream-deep/70">
        {logs?.map((log) => (
          <div key={log.id} className="p-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Chip tone={actionTone(log.action)}>{log.action}</Chip>
                <span className="text-sm text-stone-500">by <b className="text-ink">{log.actorLabel || 'system'}</b></span>
              </div>
              {log.entityType && <p className="text-xs text-stone-400 mt-1">{log.entityType}</p>}
            </div>
            <p className="text-xs text-stone-400 shrink-0">{dateTimeStr(log.createdAt)}</p>
          </div>
        ))}
        {!loading && logs?.length === 0 && <EmptyState icon={ScrollText} title="No platform events yet" />}
      </div>
    </div>
  );
};

export default Audit;
