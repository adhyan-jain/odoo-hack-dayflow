import React, { useEffect, useState } from 'react';
import { UserProfile, OrgNode, OrgRewindResponse } from '@/types';

interface OrgChartViewProps {
  currentUser: UserProfile;
  fetchOrgChart: (asOf?: string) => Promise<OrgRewindResponse | null>;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

const roleBadgeClass: Record<UserProfile['role'], string> = {
  admin: 'bg-[#5b7a6b] text-[#ffffff]',
  hr: 'bg-[#c8ead8]/60 text-[#436153]',
  employee: 'bg-[#f4f4f1] text-[#625e52]',
};

const OrgNodeCard: React.FC<{ node: OrgNode; depth: number }> = ({ node, depth }) => {
  return (
    <div className={depth > 0 ? 'mt-3 ml-6 border-l border-[#eeeeeb] pl-5' : 'mt-3'}>
      <div className="bg-[#FFFFFF] rounded-2xl p-4 bento-shadow border border-[#eeeeeb] flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-[#5b7a6b]/10 text-[#436153] flex items-center justify-center font-bold text-sm shrink-0">
          {node.full_name
            .split(' ')
            .map((p) => p[0])
            .slice(0, 2)
            .join('')
            .toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#1a1c1b] truncate">{node.full_name}</p>
          <p className="text-xs text-[#625e52] truncate">
            {node.job_title ?? 'No title'}
            {node.department ? ` · ${node.department}` : ''}
          </p>
        </div>
        <span
          className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0 ${roleBadgeClass[node.role]}`}
        >
          {node.role}
        </span>
      </div>

      {node.reports.length > 0 && (
        <div>
          {node.reports.map((child) => (
            <OrgNodeCard key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export const OrgChartView: React.FC<OrgChartViewProps> = ({ currentUser, fetchOrgChart }) => {
  const [asOf, setAsOf] = useState(todayIso());
  const [response, setResponse] = useState<OrgRewindResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canView = currentUser.role !== 'employee';

  useEffect(() => {
    if (!canView) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchOrgChart(asOf);
        if (!cancelled) setResponse(res);
      } catch {
        if (!cancelled) setError('Failed to load the organization chart.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asOf, canView]);

  if (!canView) {
    return (
      <div id="org-chart-view" className="px-6 md:px-10 pb-16 max-w-3xl mx-auto w-full flex-1 flex flex-col items-center justify-center gap-3 text-center">
        <span className="material-symbols-outlined text-[#c1c8c3] text-[40px]">lock</span>
        <h2 className="text-xl font-bold text-[#1a1c1b] tracking-tight">Access restricted</h2>
        <p className="text-sm text-[#625e52] max-w-sm">
          The organization chart is only available to Admin and HR accounts. Contact your HR
          representative if you need this information.
        </p>
      </div>
    );
  }

  const tree = response?.tree ?? [];

  return (
    <div id="org-chart-view" className="px-6 md:px-10 pb-16 max-w-5xl mx-auto w-full flex-1 flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-[#1a1c1b] tracking-tight">
            Organization Chart
          </h2>
          <p className="text-[#424844] text-sm mt-0.5">
            Reporting structure, rewound to any date in the company&apos;s history
          </p>
        </div>

        <label className="flex items-center gap-2.5 bg-[#FFFFFF] border border-[#eeeeeb] rounded-full px-4 h-11 bento-shadow">
          <span className="material-symbols-outlined text-[#5b7a6b] text-[18px]">event</span>
          <span className="text-xs font-semibold text-[#424844] uppercase tracking-wider">As of</span>
          <input
            type="date"
            value={asOf}
            max={todayIso()}
            onChange={(e) => setAsOf(e.target.value)}
            className="bg-transparent border-0 text-sm text-[#1a1c1b] outline-none cursor-pointer"
          />
        </label>
      </div>

      <div className="bg-[#FFFFFF] rounded-[20px] p-6 bento-shadow border border-[#eeeeeb]">
        {loading ? (
          <div className="p-12 text-center text-sm text-[#424844]">Loading organization chart…</div>
        ) : error ? (
          <div className="p-12 text-center text-sm text-[#ba1a1a]">{error}</div>
        ) : tree.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-center">
            <span className="material-symbols-outlined text-[#c1c8c3] text-[40px]">
              account_tree
            </span>
            <p className="text-sm font-semibold text-[#1a1c1b]">No org chart data available</p>
            <p className="text-xs text-[#625e52] max-w-sm">
              No reporting relationships were found as of {asOf}. This is expected in demo mode or
              before any manager assignments have been recorded.
            </p>
          </div>
        ) : (
          <div>
            {tree.map((node) => (
              <OrgNodeCard key={node.id} node={node} depth={0} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
