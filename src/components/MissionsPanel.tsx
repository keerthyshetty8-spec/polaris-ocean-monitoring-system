import React, { useState } from 'react';
import { Compass, Plus, Calendar, CheckCircle, Navigation, Check, Clock } from 'lucide-react';
import { Mission } from '../types';

interface MissionsPanelProps {
  missions: Mission[];
  onMissionCreated: () => void;
}

export const MissionsPanel: React.FC<MissionsPanelProps> = ({ missions = [], onMissionCreated }) => {
  const [showForm, setShowForm] = useState(false);
  const [missionName, setMissionName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const safeMissions = Array.isArray(missions) ? missions : [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!missionName.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/v1/missions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          missionId: `MISSION-${Date.now().toString().slice(-4)}`,
          deviceId: 'POLARIS-001',
          name: missionName.trim(),
          description: description.trim() || undefined,
        }),
      });
      if (res.ok) {
        setMissionName('');
        setDescription('');
        setShowForm(false);
        onMissionCreated();
      }
    } catch (err) {
      console.error('Failed to create mission:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleComplete = async (mission: Mission) => {
    const newStatus = mission.status === 'active' ? 'completed' : 'active';
    setUpdatingId(mission.id);
    try {
      const res = await fetch(`/api/v1/missions/${mission.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        onMissionCreated();
      }
    } catch (err) {
      console.error('Failed to update mission status:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col h-full shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">Ocean Deployment Missions</h3>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 text-xs px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 rounded-lg transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Mission</span>
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mb-4 bg-slate-800/80 p-3.5 rounded-lg border border-slate-700 text-xs space-y-2.5">
          <div>
            <label className="block text-slate-300 font-medium mb-1">Mission Identifier / Name</label>
            <input
              type="text"
              value={missionName}
              onChange={(e) => setMissionName(e.target.value)}
              placeholder="e.g. Continental Shelf Upwelling Survey"
              className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              required
            />
          </div>
          <div>
            <label className="block text-slate-300 font-medium mb-1">Mission Objectives / Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Target depth layers, halocline profiling, hydrographic parameters..."
              className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-md transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-3.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-md font-medium transition disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Initialize Mission'}
            </button>
          </div>
        </form>
      )}

      <div className="flex-1 overflow-y-auto max-h-[260px] space-y-2 pr-1">
        {safeMissions.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center py-8 text-center text-slate-500">
            <Compass className="w-8 h-8 text-slate-700 mb-2" />
            <p className="text-xs text-slate-400 font-medium">No deployment missions recorded.</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Initialize a mission to correlate sensor telemetry to survey milestones.</p>
          </div>
        ) : (
          safeMissions.map((m) => {
            const isActive = m.status === 'active';
            const isUpdating = updatingId === m.id;

            return (
              <div
                key={m.id || m.missionId}
                className="p-3 rounded-lg bg-slate-800/60 border border-slate-800/90 flex items-start justify-between gap-3 hover:border-slate-700 transition"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-xs text-white truncate">{m.name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-700 text-cyan-300">
                      {m.missionId}
                    </span>
                    <span
                      className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded ${
                        isActive
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60 font-bold'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {m.status}
                    </span>
                  </div>
                  {m.description && (
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{m.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-2">
                    <span className="flex items-center gap-1 font-mono">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {new Date(m.startTime).toLocaleDateString()}
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="font-mono text-slate-400">
                      Device: {m.deviceId}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleToggleComplete(m)}
                  disabled={isUpdating}
                  className={`shrink-0 text-xs px-2.5 py-1 rounded border transition flex items-center gap-1 ${
                    isActive
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700'
                  }`}
                  title={isActive ? 'Mark as Completed' : 'Reactivate Mission'}
                >
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-[11px]">{isActive ? 'Complete' : 'Reactivate'}</span>
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

