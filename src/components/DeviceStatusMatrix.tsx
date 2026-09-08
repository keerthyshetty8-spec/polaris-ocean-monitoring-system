import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Radio,
  Wifi,
  WifiOff,
  Battery,
  BatteryWarning,
  Navigation,
  Clock,
  ChevronDown,
  ChevronUp,
  Server,
  Zap,
} from 'lucide-react';
import { PolarisStatus, DeviceCommunication, CurrentLocation, LocationCoordinates, DeviceBattery } from '../types';

interface DeviceStatusMatrixProps {
  statusData: PolarisStatus | null;
  commData: DeviceCommunication | null;
  locationData: CurrentLocation | null;
  locationHistory?: LocationCoordinates[];
  batteryData: DeviceBattery | null;
}

export const DeviceStatusMatrix: React.FC<DeviceStatusMatrixProps> = ({
  statusData,
  commData,
  locationData,
  locationHistory = [],
  batteryData,
}) => {
  const [showHistory, setShowHistory] = useState(false);

  // 1-second ticker to keep elapsed time and timeout expiration synchronized in real time
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => (t + 1) % 10000);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const timeoutThreshold = statusData?.timeoutThresholdSeconds ?? 60;
  const lastSeenMs = statusData?.lastSeen ? new Date(statusData.lastSeen).getTime() : 0;
  const hasValidTimestamp = lastSeenMs > 0 && !isNaN(lastSeenMs);
  const elapsedSeconds = hasValidTimestamp
    ? Math.max(0, Math.floor((Date.now() - lastSeenMs) / 1000))
    : (statusData?.secondsSinceLastSeen ?? 999999);
  const isExpired = hasValidTimestamp ? elapsedSeconds > timeoutThreshold : false;

  const isOnline = Boolean(
    !isExpired && (
      statusData?.isOnline === true ||
      statusData?.status === 'online' ||
      commData?.isOnline === true ||
      commData?.status === 'connected'
    )
  );
  const lastSeen = statusData?.lastSeen || commData?.lastSeen;
  const location = locationData?.location || statusData?.currentLocation;
  const protocol = commData?.protocol || statusData?.communication?.protocol || 'HTTP';
  const commStatus = !isOnline ? 'disconnected' : (commData?.status || statusData?.communication?.status || 'connected');
  const batteryLevel = batteryData?.level ?? statusData?.battery?.level ?? null;
  const batteryVoltage = batteryData?.voltage ?? statusData?.battery?.voltage ?? null;
  const isLowBattery = (batteryLevel !== null && batteryLevel <= 20) || (batteryData?.isLow ?? false);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">System Diagnostics & Communications Matrix</h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
          <span>ID: <strong className="text-slate-200">{statusData?.deviceId || 'POLARIS-001'}</strong></span>
          <span className="text-slate-600">•</span>
          <span>Last Beacon: {lastSeen ? new Date(lastSeen).toLocaleTimeString() : 'N/A'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Card 1: GPS Location & Navigation Fix */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
              <MapPin className="w-4 h-4 text-cyan-400" />
              <span>GPS Location & Fix</span>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
              location ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-slate-700 text-slate-400'
            }`}>
              {location ? '3D FIX LOCK' : 'NO FIX'}
            </span>
          </div>

          <div className="space-y-1.5 my-1">
            <div className="text-base sm:text-lg font-bold font-mono text-white tracking-tight">
              {location
                ? `${location.latitude.toFixed(5)}°, ${location.longitude.toFixed(5)}°`
                : 'Acquiring GNSS Satellites...'}
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-3">
              <span>Alt: <strong className="text-slate-200 font-mono">{location?.altitude !== undefined ? `${location.altitude.toFixed(1)} m` : '--'}</strong></span>
              <span>Speed: <strong className="text-slate-200 font-mono">{location?.speed !== undefined ? `${location.speed.toFixed(1)} kts` : '--'}</strong></span>
            </div>
          </div>

          {locationHistory.length > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-700/50">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="w-full flex items-center justify-between text-[11px] text-cyan-400 hover:text-cyan-300 transition"
              >
                <span>Recent Coordinates ({locationHistory.length} fixes)</span>
                {showHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showHistory && (
                <div className="mt-2 max-h-24 overflow-y-auto space-y-1 text-[10px] font-mono text-slate-400 pr-1">
                  {locationHistory.map((coord, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-slate-900/60 p-1 rounded">
                      <span>{coord.latitude.toFixed(4)}°, {coord.longitude.toFixed(4)}°</span>
                      <span className="text-slate-500">{new Date(coord.timestamp).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Card 2: Communication Status & Telemetry Pipeline */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
              <Radio className="w-4 h-4 text-indigo-400" />
              <span>Communication Status</span>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded font-mono capitalize ${
              commStatus === 'connected' || commStatus === 'active'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
            }`}>
              {commStatus}
            </span>
          </div>

          <div className="space-y-1.5 my-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Ingestion Protocol:</span>
              <span className="font-mono text-cyan-300 font-semibold">{protocol} / REST</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Telemetry Transport:</span>
              <span className="font-mono text-slate-200">ESP32 Ingest API</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Last Telemetry Handshake:</span>
              <span className="font-mono text-slate-300">
                {lastSeen ? new Date(lastSeen).toLocaleTimeString() : 'Awaiting sync'}
              </span>
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-700/50 flex items-center justify-between text-[11px] text-slate-400">
            <span>Buffer Replay Capable:</span>
            <span className="text-emerald-400 font-mono">SD Offline Sync (Ready)</span>
          </div>
        </div>

        {/* Card 3: Device State & Battery Pack Diagnostics */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
              {isOnline ? <Wifi className="w-4 h-4 text-emerald-400" /> : <WifiOff className="w-4 h-4 text-rose-400" />}
              <span>Device Health & Power</span>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
              isOnline ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
            }`}>
              {isOnline ? 'DEVICE ONLINE' : 'HEARTBEAT TIMEOUT'}
            </span>
          </div>

          <div className="space-y-1.5 my-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Battery Level:</span>
              <span className={`font-mono font-bold ${isLowBattery ? 'text-rose-400' : 'text-emerald-400'}`}>
                {batteryLevel !== null ? `${batteryLevel}%` : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Bus / Pack Voltage:</span>
              <span className="font-mono text-slate-200 font-semibold">
                {batteryVoltage !== null ? `${batteryVoltage.toFixed(2)} V` : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Heartbeat Elapsed:</span>
              <span className="font-mono text-slate-300">
                {statusData?.secondsSinceLastSeen !== undefined ? `${statusData.secondsSinceLastSeen} sec` : '< 1s'}
              </span>
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-700/50 flex items-center justify-between text-[11px] text-slate-400">
            <span>Low Power Cutoff:</span>
            <span className="text-slate-300 font-mono">20% Threshold</span>
          </div>
        </div>
      </div>
    </div>
  );
};
