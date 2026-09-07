import React from 'react';
import { Layers, ArrowDown, Thermometer, Droplets, Gauge } from 'lucide-react';
import { DepthProfileData } from '../types';

interface DepthProfileProps {
  depthData: DepthProfileData | null;
}

export const DepthProfile: React.FC<DepthProfileProps> = ({ depthData }) => {
  const currentDepth = depthData?.currentDepth ?? 0;
  
  // Calculate max depth from depthStrata points or default to 50m
  const strata = depthData?.depthStrata || [];
  const maxRecorded = strata.length > 0
    ? Math.max(...strata.map((s) => s.depthMeters), currentDepth, 40)
    : Math.max(currentDepth, 40);

  const maxScaleDepth = Math.ceil(maxRecorded / 10) * 10;
  const depthPercentage = Math.min(95, Math.max(5, (currentDepth / maxScaleDepth) * 100));

  const currentTemp = depthData?.currentTemperature;
  const currentPressure = depthData?.currentPressure;
  const currentSalinity = depthData?.currentSalinity;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col h-full shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">Ocean Depth Stratification</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-cyan-300 bg-cyan-950/60 px-2.5 py-0.5 rounded border border-cyan-800/50 font-bold">
            Probe: {currentDepth.toFixed(2)} m
          </span>
        </div>
      </div>

      {/* Visual Water Column Bar */}
      <div className="relative flex-1 min-h-[240px] rounded-lg overflow-hidden border border-slate-700/80 bg-gradient-to-b from-sky-500 via-blue-800 to-slate-950 p-3 flex flex-col justify-between select-none shadow-inner">
        {/* Surface indicator (Epipelagic) */}
        <div className="flex items-center justify-between text-[11px] text-sky-100 font-semibold z-10 drop-shadow">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-300"></span>
            <span>Surface Layer (0 m)</span>
          </div>
          <span className="text-[10px] uppercase tracking-wider bg-slate-900/50 px-1.5 py-0.5 rounded">
            Epipelagic Sunlight Zone
          </span>
        </div>

        {/* Current depth indicator marker */}
        <div
          className="absolute left-0 right-0 border-t-2 border-dashed border-amber-300 transition-all duration-700 z-20 flex items-center justify-between px-3"
          style={{ top: `${depthPercentage}%` }}
        >
          <div className="bg-amber-400 text-slate-950 text-[10px] font-bold px-2 py-0.5 rounded shadow-lg flex items-center gap-1 -translate-y-1/2">
            <ArrowDown className="w-3.5 h-3.5" />
            <span>BUOY PROBE: {currentDepth.toFixed(2)} m</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-900/90 text-amber-200 text-[10px] font-mono px-2 py-0.5 rounded border border-amber-400/30 -translate-y-1/2">
            {currentTemp !== null && currentTemp !== undefined && (
              <span>{currentTemp.toFixed(2)}°C</span>
            )}
            {currentSalinity !== null && currentSalinity !== undefined && (
              <span>• {currentSalinity.toFixed(1)} PSU</span>
            )}
          </div>
        </div>

        {/* Thermocline Boundary Marker */}
        <div className="border-t border-cyan-300/40 py-1 text-center text-[10px] text-cyan-200/80 z-10 bg-slate-900/30 rounded backdrop-blur-xs">
          <span>Thermocline Gradient Layer (~15m - 25m)</span>
        </div>

        {/* Deep Ocean Floor (Bathypelagic) */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 z-10 border-t border-slate-700/60 pt-1">
          <span className="font-semibold text-slate-300">Mesopelagic Abyss</span>
          <span className="font-mono text-slate-400">Scale Floor: {maxScaleDepth} m</span>
        </div>
      </div>

      {/* Depth Metrics Summary */}
      <div className="mt-3.5 grid grid-cols-3 gap-2 text-xs">
        <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60">
          <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-0.5">
            <Gauge className="w-3 h-3 text-cyan-400" />
            <span>Hydrostatic</span>
          </div>
          <span className="font-semibold text-white font-mono">
            {currentPressure !== null && currentPressure !== undefined ? `${currentPressure.toFixed(2)} bar` : '--'}
          </span>
        </div>

        <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60">
          <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-0.5">
            <Thermometer className="w-3 h-3 text-amber-400" />
            <span>At Depth Temp</span>
          </div>
          <span className="font-semibold text-white font-mono">
            {currentTemp !== null && currentTemp !== undefined ? `${currentTemp.toFixed(2)} °C` : '--'}
          </span>
        </div>

        <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60">
          <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-0.5">
            <Layers className="w-3 h-3 text-indigo-400" />
            <span>Profile Strata</span>
          </div>
          <span className="font-semibold text-white font-mono">
            {strata.length} sample levels
          </span>
        </div>
      </div>

      {/* Depth Strata Points Preview */}
      {strata.length > 0 && (
        <div className="mt-3 pt-2.5 border-t border-slate-800">
          <div className="text-[11px] text-slate-400 mb-1.5 font-medium flex items-center justify-between">
            <span>Stratification Samples</span>
            <span className="text-[10px] font-mono text-slate-500">Latest profile sweep</span>
          </div>
          <div className="max-h-20 overflow-y-auto space-y-1 text-[10px] font-mono text-slate-300 pr-1">
            {strata.slice(0, 5).map((point, index) => (
              <div key={index} className="flex items-center justify-between bg-slate-800/40 px-2 py-1 rounded">
                <span className="text-cyan-300 font-semibold">{point.depthMeters.toFixed(1)} m</span>
                <span className="text-amber-300">{point.temperature !== null ? `${point.temperature.toFixed(1)}°C` : '--'}</span>
                <span className="text-blue-300">{point.salinity !== null ? `${point.salinity.toFixed(1)} PSU` : '--'}</span>
                <span className="text-slate-400">{point.pressure !== null ? `${point.pressure.toFixed(2)} bar` : '--'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

