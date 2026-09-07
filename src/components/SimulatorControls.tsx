import React, { useState } from 'react';
import { Play, Pause, Send, Database, RefreshCw, FileSpreadsheet, ExternalLink, Cpu, ShieldCheck, ShieldAlert } from 'lucide-react';

interface SimulatorControlsProps {
  onSendSingle: (override?: any) => Promise<void>;
  onSendBatch: () => Promise<void>;
  onSendDuplicate: () => Promise<void>;
  onTestInvalidKey?: () => Promise<void>;
  onExportCsv: () => void;
  isSimulating: boolean;
  onToggleSimulation: () => void;
  statusLog: string;
}

export const SimulatorControls: React.FC<SimulatorControlsProps> = ({
  onSendSingle,
  onSendBatch,
  onSendDuplicate,
  onTestInvalidKey,
  onExportCsv,
  isSimulating,
  onToggleSimulation,
  statusLog,
}) => {
  const [loading, setLoading] = useState(false);

  const handleAction = async (action: () => Promise<void>) => {
    setLoading(true);
    try {
      await action();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">ESP32 Hardware Pipeline Test Bench</h3>
          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-950/60 text-emerald-400 border border-emerald-800/80">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>X-API-Key: Enforced</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/docs"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition"
          >
            <span>Swagger API Docs</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <button
            onClick={onExportCsv}
            className="flex items-center gap-1 text-xs bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 px-2.5 py-1 rounded transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5 mb-3">
        {/* Continuous simulation toggle */}
        <button
          onClick={onToggleSimulation}
          className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${
            isSimulating
              ? 'bg-rose-600 hover:bg-rose-500 text-white'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
          }`}
        >
          {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          <span>{isSimulating ? 'Stop Stream' : 'Auto Stream (3s)'}</span>
        </button>

        {/* Single live reading */}
        <button
          disabled={loading || isSimulating}
          onClick={() => handleAction(() => onSendSingle())}
          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition"
        >
          <Send className="w-3.5 h-3.5 text-cyan-400" />
          <span>Send 1 Reading</span>
        </button>

        {/* Offline SD Batch Sync */}
        <button
          disabled={loading || isSimulating}
          onClick={() => handleAction(onSendBatch)}
          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition"
        >
          <Database className="w-3.5 h-3.5 text-indigo-400" />
          <span>Replay Offline Batch</span>
        </button>

        {/* Test Deduplication */}
        <button
          disabled={loading || isSimulating}
          onClick={() => handleAction(onSendDuplicate)}
          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition"
        >
          <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
          <span>Test Dedup Skip</span>
        </button>

        {/* Trigger Low Battery Warning */}
        <button
          disabled={loading || isSimulating}
          onClick={() => handleAction(() => onSendSingle({ battery: 14.5, batteryVoltage: 10.9 }))}
          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-rose-300 rounded-lg text-xs font-medium border border-slate-700 transition"
        >
          <span>Simulate Low Batt</span>
        </button>

        {/* Trigger Abnormal Temperature */}
        <button
          disabled={loading || isSimulating}
          onClick={() => handleAction(() => onSendSingle({ temperature: 38.5 }))}
          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-amber-300 rounded-lg text-xs font-medium border border-slate-700 transition"
        >
          <span>Simulate High Temp</span>
        </button>

        {/* Test Invalid Key (401 verification) */}
        {onTestInvalidKey && (
          <button
            disabled={loading || isSimulating}
            onClick={() => handleAction(onTestInvalidKey)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-400 hover:text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition"
            title="Sends request without valid API Key to verify 401 is strictly enforced"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>Verify 401 Auth</span>
          </button>
        )}
      </div>

      {statusLog && (
        <div className="bg-slate-950 px-3 py-2 rounded border border-slate-800 text-[11px] font-mono text-cyan-300 flex items-center justify-between">
          <span className="truncate">{statusLog}</span>
          <span className="text-slate-500 text-[10px] ml-2 shrink-0">ESP32 Ingestion Log</span>
        </div>
      )}
    </div>
  );
};
