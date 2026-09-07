export interface SensorReading {
  id: string;
  deviceId: string;
  timestamp: string;
  temperature: number;
  pressure?: number | null;
  depth?: number | null;
  conductivity?: number | null;
  salinity?: number | null;
  atmosphericTemp?: number | null;
  atmosphericPressure?: number | null;
  atmosphericHumidity?: number | null;
  atmospheric?: {
    temperature?: number;
    pressure?: number;
    humidity?: number;
  };
  battery?: number | null;
  batteryVoltage?: number | null;
  source?: string;
  ingestionMethod?: string;
  eventId?: string | null;
  fingerprint?: string;
  missionId?: string | null;
  createdAt?: string;
}

export interface PolarisStatus {
  deviceId: string;
  name?: string;
  status: 'online' | 'offline' | 'degraded';
  isOnline: boolean;
  lastSeen: string | null;
  secondsSinceLastSeen?: number;
  timeoutThresholdSeconds?: number;
  battery?: {
    level: number | null;
    voltage: number | null;
    status: 'normal' | 'low' | 'critical';
  };
  communication?: {
    protocol: string;
    status: string;
    lastCommTimestamp: string | null;
  };
  currentLocation?: {
    latitude: number;
    longitude: number;
    altitude: number;
    speed: number;
    timestamp: string;
  };
  lastUpdated?: string;
}

export interface DeviceBattery {
  deviceId: string;
  level: number;
  voltage: number;
  isLow: boolean;
  threshold: number;
  lastUpdated: string;
}

export interface DeviceCommunication {
  deviceId: string;
  protocol: string;
  status: string;
  isOnline: boolean;
  lastSeen: string;
  details?: Record<string, any>;
}

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  altitude?: number;
  speed?: number;
  timestamp: string;
}

export interface CurrentLocation {
  deviceId: string;
  available: boolean;
  location: LocationCoordinates | null;
}

export interface DepthStrataPoint {
  depthMeters: number;
  temperature: number | null;
  salinity: number | null;
  pressure: number | null;
  timestamp: string;
}

export interface DepthProfileData {
  deviceId: string;
  available: boolean;
  currentDepth: number;
  currentTemperature: number | null;
  currentPressure: number | null;
  currentSalinity: number | null;
  timestamp: string;
  depthStrata: DepthStrataPoint[];
  maxRecordedDepth?: number;
}

export interface SystemAlert {
  id: string;
  deviceId: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: string;
  resolved: boolean;
  resolvedAt?: string | null;
  metadata?: Record<string, any>;
}

export interface Mission {
  id: string;
  missionId: string;
  deviceId: string;
  name: string;
  description?: string | null;
  startTime: string;
  endTime?: string | null;
  status: 'active' | 'completed' | 'aborted';
  createdAt: string;
}

export interface HealthData {
  status: string;
  system: string;
  version: string;
  database: string;
  mqtt: string;
  timestamp: string;
  uptimeSeconds: number;
}

export type HealthStatus = HealthData;
export type GpsLocation = CurrentLocation;

export type SseConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';
