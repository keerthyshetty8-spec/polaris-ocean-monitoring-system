import React from 'react';
import {
  Activity,
  Wifi,
  WifiOff,
  Battery,
  BatteryWarning,
  BatteryCharging,
  Clock,
  MapPin,
  Database,
  Radio,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { PolarisStatus, HealthData, DeviceBattery, DeviceCommunication, CurrentLocation, SseConnectionState } from '../types';

interface StatusHeaderProps {
  statusData: PolarisStatus | null;
  healthData: HealthData | null;
  batteryData: DeviceBattery | null;
  commData: DeviceCommunication | null;
  locationData: CurrentLocation | null;
  sseStatus: SseConnectionState;
  isLoading: boolean;
  onRefresh: () => void;
  onReconnectSse?: () => void;
}

export const StatusHeader: React.FC<StatusHeaderProps> = ({
  statusData,
  healthData,
  batteryData,
  commData,
  locationData,
  sseStatus,
  isLoading,
  onRefresh,
  onReconnectSse,
}) => {
  // 1-second ticker to keep elapsed time and timeout expiration reactive
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
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

  const displaySecondsAgo = hasValidTimestamp ? elapsedSeconds : statusData?.secondsSinceLastSeen;
  const batteryLevel = batteryData?.level ?? statusData?.battery?.level ?? null;
  const batteryVoltage = batteryData?.voltage ?? statusData?.battery?.voltage ?? null;
  const isLowBattery = (batteryLevel !== null && batteryLevel <= 20) || statusData?.battery?.status === 'low';
  const location = locationData?.location || statusData?.currentLocation || null;
  const protocol = commData?.protocol || statusData?.communication?.protocol || 'HTTP/MQTT';
  const commStatus = commData?.status || statusData?.communication?.status || (isOnline ? 'active' : 'idle');

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 p-4 md:p-6 sticky top-0 z-30 shadow-lg shadow-black/20 backdrop-blur-md bg-slate-900/95">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Brand & Telemetry Subsystem Header */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 rounded-xl shadow-inner shadow-cyan-500/10">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>POLARIS</span>
                <span className="text-cyan-400 font-mono text-sm font-normal">• Buoy Telemetry</span>
              </h1>
              <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono border border-slate-700">
                M4 Data & M5 Comms
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700/80">
                Ocean Monitoring
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
              <span>Unit: <strong className="text-slate-200">{statusData?.deviceId || 'POLARIS-001'}</strong></span>
              <span className="text-slate-600">•</span>
              <span>Transport: <span className="font-mono text-cyan-300 font-medium">{protocol}</span></span>
              <span className="text-slate-600">•</span>
              <span>Link: <span className="capitalize text-slate-300 font-mono">{commStatus}</span></span>
            </p>
          </div>
        </div>

        {/* Status Indicators & Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Device Online/Offline Status */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
              isOnline
                ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60'
                : 'bg-rose-950/40 text-rose-400 border-rose-800/60'
            }`}
            title={isOnline ? 'Telemetry beacon active' : 'Device timeout exceeded threshold'}
          >
            <span className="relative flex h-2 w-2">
              {isOnline && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isOnline ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              ></span>
            </span>
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span>{isOnline ? 'BUOY ONLINE' : 'BUOY OFFLINE'}</span>
            {displaySecondsAgo !== undefined && displaySecondsAgo > 0 && (
              <span className="text-slate-400 font-normal text-[11px]">
                ({displaySecondsAgo}s ago)
              </span>
            )}
          </div>

          {/* SSE Real-Time Stream Status */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border ${
              sseStatus === 'connected'
                ? 'bg-cyan-950/40 text-cyan-300 border-cyan-800/50'
                : sseStatus === 'reconnecting' || sseStatus === 'connecting'
                ? 'bg-amber-950/40 text-amber-300 border-amber-800/50'
                : 'bg-rose-950/40 text-rose-300 border-rose-800/50'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${sseStatus === 'connected' ? 'text-cyan-400 animate-pulse' : 'text-amber-400'}`} />
            <span>
              SSE: {sseStatus === 'connected' ? 'Live Stream' : sseStatus === 'reconnecting' ? 'Reconnecting...' : sseStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
            </span>
            {sseStatus === 'disconnected' && onReconnectSse && (
              <button
                onClick={onReconnectSse}
                className="ml-1 underline hover:text-white font-semibold text-[10px]"
              >
                Reconnect
              </button>
            )}
          </div>

          {/* Battery Status */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${
              isLowBattery
                ? 'bg-amber-950/40 text-amber-300 border-amber-800/60'
                : 'bg-slate-800/90 text-slate-200 border-slate-700'
            }`}
          >
            {isLowBattery ? (
              <BatteryWarning className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span>
              Batt: <strong className="text-white">{batteryLevel !== null ? `${batteryLevel}%` : 'N/A'}</strong>
              {batteryVoltage && (
                <span className="text-slate-400 text-[11px] ml-1">({batteryVoltage.toFixed(2)}V)</span>
              )}
            </span>
          </div>

          {/* GNSS Coordinates */}
          <div
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-slate-800/90 text-slate-300 border border-slate-700"
            title="GPS Geo-Fix Coordinates"
          >
            <MapPin className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              {location
                ? `${location.latitude.toFixed(4)}°N, ${location.longitude.toFixed(4)}°E`
                : 'GNSS: Acquiring Fix'}
            </span>
          </div>

          {/* Database Health */}
          <div
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs bg-slate-800/80 text-slate-300 border border-slate-700/80 font-mono"
            title="Backend Persistence Engine"
          >
            <Database className="w-3.5 h-3.5 text-indigo-400" />
            <span className="capitalize">{healthData?.database?.split(' ')[0] || 'PostgreSQL'}</span>
          </div>

          {/* Manual Refresh / Sync Button */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs border border-slate-700 hover:border-slate-600 transition disabled:opacity-60"
            title="Poll and refresh all telemetry endpoints"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Syncing...' : 'Sync'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};

