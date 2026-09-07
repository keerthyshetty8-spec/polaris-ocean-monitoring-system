import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  TrendingUp,
  Thermometer,
  ArrowDown,
  Droplets,
  Battery,
  Zap,
  Gauge,
  Sun,
} from 'lucide-react';
import { SensorReading } from '../types';

interface SensorChartsProps {
  historyData: SensorReading[];
}

type MetricKey =
  | 'temperature'
  | 'depth'
  | 'salinity'
  | 'conductivity'
  | 'atmosphericPressure'
  | 'atmosphericTemp'
  | 'battery';

export const SensorCharts: React.FC<SensorChartsProps> = ({ historyData = [] }) => {
  const [activeMetric, setActiveMetric] = useState<MetricKey>('temperature');

  const safeHistory = Array.isArray(historyData) ? historyData : [];

  const formattedData = useMemo(() => {
    return [...safeHistory].reverse().map((d) => ({
      time: d.timestamp
        ? new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : '--',
      temperature: d.temperature !== null && d.temperature !== undefined ? Number(d.temperature) : null,
      depth: d.depth !== null && d.depth !== undefined ? Number(d.depth) : null,
      salinity: d.salinity !== null && d.salinity !== undefined ? Number(d.salinity) : null,
      conductivity: d.conductivity !== null && d.conductivity !== undefined ? Number(d.conductivity) : null,
      atmosphericPressure:
        d.atmosphericPressure !== null && d.atmosphericPressure !== undefined
          ? Number(d.atmosphericPressure)
          : d.atmospheric?.pressure !== undefined
          ? Number(d.atmospheric.pressure)
          : null,
      atmosphericTemp:
        d.atmosphericTemp !== null && d.atmosphericTemp !== undefined
          ? Number(d.atmosphericTemp)
          : d.atmospheric?.temperature !== undefined
          ? Number(d.atmospheric.temperature)
          : null,
      battery: d.battery !== null && d.battery !== undefined ? Number(d.battery) : null,
    }));
  }, [safeHistory]);

  const metricConfigs: Record<
    MetricKey,
    { label: string; color: string; icon: React.ComponentType<{ className?: string }>; unit: string }
  > = {
    temperature: {
      label: 'Water Temp',
      color: '#f59e0b',
      icon: Thermometer,
      unit: '°C',
    },
    depth: {
      label: 'Ocean Depth',
      color: '#06b6d4',
      icon: ArrowDown,
      unit: 'm',
    },
    salinity: {
      label: 'Salinity',
      color: '#3b82f6',
      icon: Droplets,
      unit: 'PSU',
    },
    conductivity: {
      label: 'Conductivity',
      color: '#10b981',
      icon: Zap,
      unit: 'mS/cm',
    },
    atmosphericPressure: {
      label: 'Atm Pressure',
      color: '#818cf8',
      icon: Gauge,
      unit: 'hPa',
    },
    atmosphericTemp: {
      label: 'Air Temp',
      color: '#fb923c',
      icon: Sun,
      unit: '°C',
    },
    battery: {
      label: 'Battery Pack',
      color: '#34d399',
      icon: Battery,
      unit: '%',
    },
  };

  const current = metricConfigs[activeMetric];

  // Calculate high/low/average for active metric
  const stats = useMemo(() => {
    const values = formattedData
      .map((d) => d[activeMetric])
      .filter((v): v is number => v !== null && !isNaN(v));

    if (values.length === 0) return null;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    return { min, max, avg, count: values.length };
  }, [formattedData, activeMetric]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col h-full shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">Historical Telemetry Series</h3>
          {stats && (
            <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              {stats.count} frames
            </span>
          )}
        </div>

        {/* Metric Selector Tabs */}
        <div className="flex flex-wrap gap-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700/60">
          {(Object.keys(metricConfigs) as MetricKey[]).map((key) => {
            const cfg = metricConfigs[key];
            const Icon = cfg.icon;
            const isSelected = activeMetric === key;
            return (
              <button
                key={key}
                onClick={() => setActiveMetric(key)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition ${
                  isSelected
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="whitespace-nowrap">{cfg.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Min / Max / Avg stats banner */}
      {stats && (
        <div className="flex items-center gap-4 text-xs font-mono mb-3 bg-slate-800/40 p-2 rounded-lg border border-slate-800">
          <span className="text-slate-400">
            Min: <strong className="text-slate-200">{stats.min.toFixed(2)} {current.unit}</strong>
          </span>
          <span className="text-slate-400">
            Avg: <strong className="text-cyan-300">{stats.avg.toFixed(2)} {current.unit}</strong>
          </span>
          <span className="text-slate-400">
            Max: <strong className="text-slate-200">{stats.max.toFixed(2)} {current.unit}</strong>
          </span>
        </div>
      )}

      <div className="flex-1 min-h-[240px] w-full">
        {formattedData.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-xs text-slate-500 py-12">
            <TrendingUp className="w-8 h-8 text-slate-700 mb-2" />
            <p>Awaiting historical telemetry records from backend pipeline...</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={formattedData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
              <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '0.5rem',
                  fontSize: '12px',
                  color: '#f8fafc',
                }}
                formatter={(val: any) => [`${Number(val).toFixed(2)} ${current.unit}`, current.label]}
              />
              <Line
                type="monotone"
                dataKey={activeMetric}
                stroke={current.color}
                strokeWidth={2.5}
                dot={{ r: 2, fill: current.color }}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

