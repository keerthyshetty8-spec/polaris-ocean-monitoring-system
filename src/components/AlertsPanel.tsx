import React, { useState } from 'react';
import { AlertTriangle, AlertCircle, CheckCircle2, ShieldAlert, Check, RefreshCw } from 'lucide-react';
import { SystemAlert } from '../types';

interface AlertsPanelProps {
  alerts: SystemAlert[];
  onResolve: (id: string) => Promise<void> | void;
}

export const AlertsPanel: React.FC<AlertsPanelProps> = ({ alerts = [], onResolve }) => {
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const safeAlerts = Array.isArray(alerts) ? alerts : [];
  const activeAlerts = safeAlerts.filter((a) => !a.resolved);

  const handleResolve = async (id: string) => {
    setResolvingId(id);
    try {
      await onResolve(id);
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col h-full shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-white">System & Threshold Alerts</h3>
        </div>
        <span
          className={`text-xs px-2.5 py-0.5 rounded font-mono ${
            activeAlerts.length > 0
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold'
              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          }`}
        >
          {activeAlerts.length > 0 ? `${activeAlerts.length} Active` : 'All Clear'}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[260px] space-y-2.5 pr-1">
        {safeAlerts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center py-8 text-center text-slate-500">
            <CheckCircle2 className="w-8 h-8 text-emerald-500/40 mb-2" />
            <p className="text-xs text-slate-400 font-medium">Nominal ocean conditions.</p>
            <p className="text-[11px] text-slate-500 mt-0.5">No active threshold violations or hardware alarms.</p>
          </div>
        ) : (
          safeAlerts.map((alert) => {
            const isCritical = alert.severity === 'critical';
            const isResolving = resolvingId === alert.id;

            return (
              <div
                key={alert.id}
                className={`p-3 rounded-lg border flex items-start justify-between gap-3 transition ${
                  alert.resolved
                    ? 'bg-slate-800/40 border-slate-800 opacity-60'
                    : isCritical
                    ? 'bg-rose-950/30 border-rose-800/60 text-rose-200'
                    : 'bg-amber-950/30 border-amber-800/60 text-amber-200'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {alert.resolved ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : isCritical ? (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold uppercase tracking-wider font-mono">
                        {alert.type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                      {alert.resolved && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 font-mono">
                          RESOLVED
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">{alert.message}</p>
                  </div>
                </div>

                {!alert.resolved && (
                  <button
                    onClick={() => handleResolve(alert.id)}
                    disabled={isResolving}
                    className="shrink-0 text-xs px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded border border-slate-700 transition flex items-center gap-1 disabled:opacity-50"
                  >
                    {isResolving ? (
                      <RefreshCw className="w-3 h-3 animate-spin text-cyan-400" />
                    ) : (
                      <Check className="w-3 h-3 text-emerald-400" />
                    )}
                    <span>{isResolving ? 'Resolving...' : 'Acknowledge'}</span>
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

