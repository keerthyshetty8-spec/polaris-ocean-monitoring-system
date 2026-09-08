import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StatusHeader } from './components/StatusHeader';
import { SensorCards } from './components/SensorCards';
import { DeviceStatusMatrix } from './components/DeviceStatusMatrix';
import { DepthProfile } from './components/DepthProfile';
import { SensorCharts } from './components/SensorCharts';
import { AlertsPanel } from './components/AlertsPanel';
import { MissionsPanel } from './components/MissionsPanel';
import { SimulatorControls } from './components/SimulatorControls';
import {
  PolarisStatus,
  HealthStatus,
  SensorReading,
  DepthProfileData,
  SystemAlert,
  Mission,
  DeviceBattery,
  DeviceCommunication,
  GpsLocation,
  SseConnectionState,
} from './types';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function App() {
  const [statusData, setStatusData] = useState<PolarisStatus | null>(null);
  const [healthData, setHealthData] = useState<HealthStatus | null>(null);
  const [latestReading, setLatestReading] = useState<SensorReading | null>(null);
  const [depthData, setDepthData] = useState<DepthProfileData | null>(null);
  const [historyData, setHistoryData] = useState<SensorReading[]>([]);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [batteryData, setBatteryData] = useState<DeviceBattery | null>(null);
  const [commData, setCommData] = useState<DeviceCommunication | null>(null);
  const [locationData, setLocationData] = useState<GpsLocation | null>(null);

  const [sseStatus, setSseStatus] = useState<SseConnectionState>('connecting');
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [statusLog, setStatusLog] = useState<string>('Initializing POLARIS telemetry pipeline...');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);
  const simulationTimerRef = useRef<any>(null);
  const lastPayloadRef = useRef<any>(null);

  // 1. Comprehensive Backend Data Fetching
  const fetchAll = useCallback(async () => {
    try {
      const [
        statusRes,
        healthRes,
        latestRes,
        depthRes,
        historyRes,
        alertsRes,
        missionsRes,
        batteryRes,
        commRes,
        locRes,
      ] = await Promise.allSettled([
        fetch('/api/v1/polaris/status').then((r) => r.json()),
        fetch('/health').then((r) => r.json()),
        fetch('/api/v1/sensors/latest').then((r) => r.json()),
        fetch('/api/v1/depth/profile').then((r) => r.json()),
        fetch('/api/v1/sensors/history?limit=30').then((r) => r.json()),
        fetch('/api/v1/alerts').then((r) => r.json()),
        fetch('/api/v1/missions').then((r) => r.json()),
        fetch('/api/v1/device/battery').then((r) => r.json()),
        fetch('/api/v1/device/communication').then((r) => r.json()),
        fetch('/api/v1/location/current').then((r) => r.json()),
      ]);

      if (statusRes.status === 'fulfilled' && statusRes.value?.success) setStatusData(statusRes.value.data);
      if (healthRes.status === 'fulfilled' && healthRes.value?.success) setHealthData(healthRes.value.data);
      if (latestRes.status === 'fulfilled' && latestRes.value?.success) setLatestReading(latestRes.value.data);
      if (depthRes.status === 'fulfilled' && depthRes.value?.success) setDepthData(depthRes.value.data);
      if (historyRes.status === 'fulfilled' && historyRes.value?.success) {
        setHistoryData(historyRes.value.data.readings || []);
      }
      if (alertsRes.status === 'fulfilled' && alertsRes.value?.success) setAlerts(alertsRes.value.data || []);
      if (missionsRes.status === 'fulfilled' && missionsRes.value?.success) setMissions(missionsRes.value.data || []);
      if (batteryRes.status === 'fulfilled' && batteryRes.value?.success) setBatteryData(batteryRes.value.data);
      if (commRes.status === 'fulfilled' && commRes.value?.success) setCommData(commRes.value.data);
      if (locRes.status === 'fulfilled' && locRes.value?.success) setLocationData(locRes.value.data);

      setLastSyncTime(new Date().toLocaleTimeString());
      setFetchError(null);
    } catch (err: any) {
      console.error('Error fetching backend state:', err);
      setFetchError(err.message || 'Failed to sync with backend');
    } finally {
      setInitialLoading(false);
    }
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchAll();
    setIsRefreshing(false);
  };

  // 2. Setup Real-time SSE Connection with exponential backoff & cleanup
  const connectSse = useCallback(() => {
    // Teardown previous EventSource to prevent duplicate connections
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (!isMountedRef.current) return;

    setSseStatus((prev) => (prev === 'connected' ? 'reconnecting' : prev === 'disconnected' ? 'connecting' : prev));

    const es = new EventSource('/api/v1/realtime/stream');
    eventSourceRef.current = es;

    es.onopen = () => {
      if (!isMountedRef.current) return;
      const wasReconnecting = retryCountRef.current > 0;
      retryCountRef.current = 0; // Reset backoff counter
      setSseStatus('connected');
      setStatusLog('[SSE STREAM] Connected to POLARIS realtime telemetry channel.');
      if (wasReconnecting) {
        // Automatically sync latest state after reconnection
        fetchAll();
      }
    };

    es.onerror = () => {
      if (!isMountedRef.current) return;
      es.close();
      if (eventSourceRef.current === es) {
        eventSourceRef.current = null;
      }

      setSseStatus('reconnecting');
      // Exponential backoff: base 1.5s, factor 1.5, capped at 15s
      const delay = Math.min(1500 * Math.pow(1.5, retryCountRef.current), 15000);
      retryCountRef.current += 1;

      setStatusLog(
        `[SSE STREAM] Stream interrupted. Reconnecting in ${(delay / 1000).toFixed(1)}s (attempt ${retryCountRef.current})...`
      );

      reconnectTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          connectSse();
        }
      }, delay);
    };

    es.addEventListener('sensor:update', (e: MessageEvent) => {
      if (!isMountedRef.current) return;
      try {
        const data: SensorReading = JSON.parse(e.data);
        setLatestReading(data);
        setHistoryData((prev) => [data, ...prev.slice(0, 29)]);

        // Update depth profile dynamically if depth measurement present
        if (data.depth !== undefined && data.depth !== null) {
          setDepthData((prev) => {
            if (!prev) {
              return {
                deviceId: data.deviceId,
                available: true,
                currentDepth: data.depth!,
                currentTemperature: data.temperature ?? null,
                currentPressure: data.pressure ?? null,
                currentSalinity: data.salinity ?? null,
                depthStrata: [],
                timestamp: data.timestamp,
              };
            }
            return {
              ...prev,
              currentDepth: data.depth!,
              currentTemperature: data.temperature ?? prev.currentTemperature,
              currentPressure: data.pressure ?? prev.currentPressure,
              currentSalinity: data.salinity ?? prev.currentSalinity,
              timestamp: data.timestamp,
            };
          });
        }

        // Update battery if included
        if (data.battery !== undefined && data.battery !== null) {
          setBatteryData((prev) =>
            prev ? { ...prev, level: data.battery!, voltage: data.batteryVoltage ?? prev.voltage } : null
          );
        }

        // Keep statusData consistent and online whenever fresh telemetry is received
        const readingTimestamp = data.timestamp || new Date().toISOString();
        setStatusData((prev) => {
          if (!prev) {
            return {
              deviceId: data.deviceId || 'POLARIS-001',
              status: 'online',
              isOnline: true,
              lastSeen: readingTimestamp,
              secondsSinceLastSeen: 0,
              timeoutThresholdSeconds: 60,
              battery: {
                level: data.battery ?? null,
                voltage: data.batteryVoltage ?? null,
                status: data.battery !== null && data.battery !== undefined && data.battery <= 20 ? 'low' : 'normal',
              },
              communication: {
                protocol: (data.ingestionMethod || 'HTTP').toUpperCase(),
                status: 'connected',
                lastCommTimestamp: readingTimestamp,
              },
            };
          }
          return {
            ...prev,
            status: 'online',
            isOnline: true,
            lastSeen: readingTimestamp,
            secondsSinceLastSeen: 0,
            battery: {
              ...prev.battery,
              level: data.battery ?? prev.battery?.level ?? null,
              voltage: data.batteryVoltage ?? prev.battery?.voltage ?? null,
              status:
                data.battery !== null && data.battery !== undefined
                  ? data.battery <= 20
                    ? 'low'
                    : 'normal'
                  : prev.battery?.status ?? 'normal',
            },
            communication: {
              ...prev.communication,
              protocol: (data.ingestionMethod || prev.communication?.protocol || 'HTTP').toUpperCase(),
              status: 'connected',
              lastCommTimestamp: readingTimestamp,
            },
          };
        });

        setStatusLog(`[SSE EVENT] Live reading: ${data.temperature}°C, Depth ${data.depth}m, Salinity ${data.salinity} PSU`);
      } catch (err) {
        console.error('Failed to parse SSE payload', err);
      }
    });

    es.addEventListener('device:update', (e: MessageEvent) => {
      if (!isMountedRef.current) return;
      try {
        const data = JSON.parse(e.data);
        const isOnline = data.isOnline ?? (data.status === 'online');
        setStatusData((prev) => {
          if (!prev) {
            return {
              ...data,
              isOnline,
              status: isOnline ? 'online' : 'offline',
            };
          }
          return {
            ...prev,
            ...data,
            isOnline,
            status: isOnline ? 'online' : 'offline',
            battery: {
              ...prev.battery,
              ...(typeof data.battery === 'object' ? data.battery : { level: data.battery }),
            },
            communication: {
              ...prev.communication,
              ...(typeof data.communication === 'object' ? data.communication : {}),
            },
          };
        });
        setStatusLog(`[DEVICE UPDATE] Status: ${isOnline ? 'ONLINE' : 'OFFLINE'}`);
      } catch (err) {
        console.error('Failed to parse device update', err);
      }
    });

    es.addEventListener('location:update', (e: MessageEvent) => {
      if (!isMountedRef.current) return;
      try {
        const data = JSON.parse(e.data);
        setLocationData({
          deviceId: data.deviceId || 'POLARIS-001',
          available: true,
          location: data.location || {
            latitude: data.latitude,
            longitude: data.longitude,
            altitude: data.altitude,
            speed: data.speed,
            timestamp: data.timestamp,
          },
        });
      } catch (err) {
        console.error('Failed to parse location update', err);
      }
    });

    es.addEventListener('communication:update', (e: MessageEvent) => {
      if (!isMountedRef.current) return;
      try {
        const data = JSON.parse(e.data);
        setCommData(data);
        if (data.status === 'connected' || data.isOnline) {
          setStatusData((prev) =>
            prev
              ? {
                  ...prev,
                  isOnline: true,
                  status: 'online',
                  secondsSinceLastSeen: 0,
                  communication: {
                    protocol: data.protocol || prev.communication?.protocol || 'HTTP',
                    status: data.status || 'connected',
                    lastCommTimestamp: data.lastSeen || data.timestamp || new Date().toISOString(),
                  },
                }
              : prev
          );
        }
      } catch (err) {
        console.error('Failed to parse communication update', err);
      }
    });

    es.addEventListener('alert:new', (e: MessageEvent) => {
      if (!isMountedRef.current) return;
      try {
        const data: SystemAlert = JSON.parse(e.data);
        setAlerts((prev) => [data, ...prev]);
        setStatusLog(`[ALERT] New ${data.severity.toUpperCase()} alert: ${data.message}`);
      } catch (err) {
        console.error('Failed to parse alert', err);
      }
    });
  }, []);

  const handleManualReconnectSse = () => {
    retryCountRef.current = 0;
    connectSse();
  };

  useEffect(() => {
    isMountedRef.current = true;
    fetchAll();
    connectSse();

    // Heartbeat fallback poll every 8 seconds to ensure REST telemetry always functions
    const interval = setInterval(() => {
      if (isMountedRef.current) {
        fetchAll();
      }
    }, 8000);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [fetchAll, connectSse]);


  // 3. Simulator Actions
  const generateRealisticPayload = (overrides?: any) => {
    const depth = overrides?.depth ?? parseFloat((8.0 + (Math.random() - 0.45) * 2).toFixed(2));
    const payload = {
      deviceId: 'POLARIS-001',
      timestamp: new Date().toISOString(),
      temperature: overrides?.temperature ?? parseFloat((26.8 - depth * 0.15 + (Math.random() - 0.5) * 0.2).toFixed(2)),
      pressure: overrides?.pressure ?? parseFloat((1.013 + depth * 0.098).toFixed(2)),
      depth,
      conductivity: overrides?.conductivity ?? parseFloat((4.78 + (Math.random() - 0.5) * 0.1).toFixed(2)),
      salinity: overrides?.salinity ?? parseFloat((34.6 + (Math.random() - 0.5) * 0.2).toFixed(2)),
      atmospheric: {
        temperature: overrides?.atmospheric?.temperature ?? parseFloat((28.5 + (Math.random() - 0.5) * 1.5).toFixed(1)),
        pressure: overrides?.atmospheric?.pressure ?? parseFloat((1012.0 + (Math.random() - 0.5) * 3.0).toFixed(1)),
        humidity: overrides?.atmospheric?.humidity ?? Math.round(70 + (Math.random() - 0.5) * 8),
      },
      gnss: {
        latitude: parseFloat((17.385 + (Math.random() - 0.5) * 0.002).toFixed(6)),
        longitude: parseFloat((78.4867 + (Math.random() - 0.5) * 0.002).toFixed(6)),
        altitude: 0.1,
        speed: 0.9,
      },
      battery: overrides?.battery ?? Math.max(15, Math.min(100, Math.round(86 + (Math.random() - 0.5) * 2))),
      batteryVoltage: overrides?.batteryVoltage ?? parseFloat((12.1 + ((overrides?.battery ?? 86) / 100) * 0.7 + (Math.random() - 0.5) * 0.04).toFixed(2)),
      source: 'live',
    };
    lastPayloadRef.current = payload;
    return payload;
  };

  const handleSendSingle = async (overrides?: any) => {
    try {
      const payload = generateRealisticPayload(overrides);
      const res = await fetch('/api/v1/simulator/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload }),
      });
      const result = await res.json();
      if (res.ok) {
        setStatusLog(`[HTTP INGEST] Status ${res.status}: ${result.data?.message || 'Sensor reading ingested'}`);
      } else {
        setStatusLog(`[HTTP INGEST ERROR] Status ${res.status}: ${result.error?.message || 'Ingest failed'}`);
      }
      fetchAll();
    } catch (err: any) {
      setStatusLog(`[HTTP INGEST ERROR] ${err.message}`);
    }
  };

  const handleSendBatch = async () => {
    try {
      const baseTime = Date.now();
      const batchRecords = [1, 2, 3].map((i) => ({
        deviceId: 'POLARIS-001',
        timestamp: new Date(baseTime - (4 - i) * 60000).toISOString(),
        temperature: parseFloat((25.5 + i * 0.3).toFixed(2)),
        pressure: parseFloat((1.12 + i * 0.05).toFixed(2)),
        depth: parseFloat((10.5 + i * 0.5).toFixed(2)),
        conductivity: 4.8,
        salinity: 34.5,
        battery: 85 - i,
        source: 'buffered_sd',
      }));

      const res = await fetch('/api/v1/simulator/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId: `OFFLINE-SYNC-${Date.now()}`, records: batchRecords }),
      });
      const result = await res.json();
      if (res.ok) {
        setStatusLog(`[OFFLINE BATCH SYNC] Ingested ${result.data?.stored ?? 3} buffered SD readings.`);
      } else {
        setStatusLog(`[OFFLINE BATCH ERROR] Status ${res.status}: ${result.error?.message}`);
      }
      fetchAll();
    } catch (err: any) {
      setStatusLog(`[OFFLINE BATCH ERROR] ${err.message}`);
    }
  };

  const handleSendDuplicate = async () => {
    try {
      if (!lastPayloadRef.current) {
        await handleSendSingle();
        return;
      }
      const res = await fetch('/api/v1/simulator/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload: lastPayloadRef.current }),
      });
      const result = await res.json();
      setStatusLog(`[DEDUP TEST] Status ${res.status}: ${result.data?.message || 'Duplicate skipped'}`);
    } catch (err: any) {
      setStatusLog(`[DEDUP TEST ERROR] ${err.message}`);
    }
  };

  const handleTestInvalidKey = async () => {
    try {
      const res = await fetch('/api/v1/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'invalid_secret_key_test',
        },
        body: JSON.stringify({
          deviceId: 'POLARIS-001',
          timestamp: new Date().toISOString(),
          temperature: 25.0,
        }),
      });
      const result = await res.json();
      setStatusLog(`[AUTH TEST] Status ${res.status}: ${result.error?.message || 'Unauthorized'} (Expected: 401 Enforced)`);
    } catch (err: any) {
      setStatusLog(`[AUTH TEST ERROR] ${err.message}`);
    }
  };

  const handleToggleSimulation = () => {
    if (isSimulating) {
      clearInterval(simulationTimerRef.current);
      simulationTimerRef.current = null;
      setIsSimulating(false);
      setStatusLog('Autonomous simulation stopped.');
    } else {
      setIsSimulating(true);
      setStatusLog('Autonomous simulation running (new reading every 3 seconds)...');
      simulationTimerRef.current = setInterval(() => {
        handleSendSingle();
      }, 3000);
    }
  };

  const handleResolveAlert = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/alerts/${id}/resolve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: 'Resolved from operator control console' }),
      });
      if (res.ok) {
        setAlerts((prev) =>
          prev.map((a) => (a.id === id ? { ...a, resolved: true, resolvedAt: new Date().toISOString() } : a))
        );
        setStatusLog(`[ALERT] Alert ${id} acknowledged and marked resolved.`);
      }
    } catch (err) {
      console.error('Failed to resolve alert', err);
    }
  };

  const handleExportCsv = () => {
    window.location.href = '/api/v1/export/sensors.csv';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* 1. Header & Live Buoy Telemetry Status */}
      <StatusHeader
        statusData={statusData}
        healthData={healthData}
        batteryData={batteryData}
        commData={commData}
        locationData={locationData}
        sseStatus={sseStatus}
        isLoading={isRefreshing}
        onRefresh={handleManualRefresh}
        onReconnectSse={handleManualReconnectSse}
      />

      {/* Network Alert Notification if disconnected */}
      {fetchError && (
        <div className="bg-rose-950/80 border-b border-rose-800 text-rose-200 px-6 py-2 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Telemetry Pipeline Alert: {fetchError}</span>
          </div>
          <button
            onClick={fetchAll}
            className="flex items-center gap-1 bg-rose-900/60 hover:bg-rose-800 px-2 py-0.5 rounded text-rose-100 transition"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry Connection</span>
          </button>
        </div>
      )}

      {/* 2. Main Content Dashboard */}
      <main className="max-w-7xl mx-auto w-full p-4 md:p-6 space-y-6 flex-1">
        {/* Sensor Metric Value Cards */}
        <SensorCards reading={latestReading} batteryData={batteryData} />

        {/* Diagnostics & Subsystem Matrix (GPS, Pack Voltage, Signal RSSI, System Health) */}
        <DeviceStatusMatrix
          statusData={statusData}
          batteryData={batteryData}
          commData={commData}
          locationData={locationData}
          latestReading={latestReading}
        />

        {/* Mid Row: Ocean Depth Stratification Column & Historical Time Series Curve */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <DepthProfile depthData={depthData} />
          </div>
          <div className="lg:col-span-2">
            <SensorCharts historyData={historyData} />
          </div>
        </div>

        {/* Lower Row: Threshold Alerts & Missions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AlertsPanel alerts={alerts} onResolve={handleResolveAlert} />
          <MissionsPanel missions={missions} onMissionCreated={fetchAll} />
        </div>

        {/* Hardware Ingestion Test Bench & Simulator Controls */}
        <SimulatorControls
          onSendSingle={handleSendSingle}
          onSendBatch={handleSendBatch}
          onSendDuplicate={handleSendDuplicate}
          onTestInvalidKey={handleTestInvalidKey}
          onExportCsv={handleExportCsv}
          isSimulating={isSimulating}
          onToggleSimulation={handleToggleSimulation}
          statusLog={statusLog}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 px-6 py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                sseStatus === 'connected'
                  ? 'bg-emerald-400'
                  : sseStatus === 'reconnecting' || sseStatus === 'connecting'
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-rose-400'
              }`}
            ></div>
            <span>
              POLARIS Ocean Monitoring System • Realtime Telemetry Stream:{' '}
              {sseStatus === 'connected'
                ? 'Active'
                : sseStatus === 'reconnecting'
                ? 'Reconnecting'
                : sseStatus === 'connecting'
                ? 'Connecting'
                : 'Offline'}
            </span>
          </div>
          <div className="flex items-center gap-4">
            {lastSyncTime && <span className="text-slate-400 font-mono">Last Sync: {lastSyncTime}</span>}
            <a
              href="/api/docs"
              target="_blank"
              rel="noreferrer"
              className="text-cyan-400 hover:text-cyan-300 transition"
            >
              OpenAPI Specification
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

