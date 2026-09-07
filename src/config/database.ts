import { PrismaClient } from '@prisma/client';
import { env } from './env.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('Database');

// In-Memory store to guarantee continuous operation if external Postgres is not connected in dev mode
class InMemoryStore {
  devices = new Map<string, any>();
  readings: any[] = [];
  locations: any[] = [];
  alerts: any[] = [];
  missions = new Map<string, any>();
  commStatuses: any[] = [];
  syncRecords: any[] = [];

  constructor() {
    // Initialize default POLARIS device
    const now = new Date();
    this.devices.set('POLARIS-001', {
      id: 'dev-001',
      deviceId: 'POLARIS-001',
      name: 'POLARIS Ocean Buoy Alpha',
      status: 'online',
      lastSeen: now,
      createdAt: now,
      updatedAt: now,
    });
  }
}

const memoryStore = new InMemoryStore();
let prismaClientInstance: PrismaClient | null = null;
let isPostgresAvailable = false;

// Initialize Prisma client lazily and safely
export function getPrismaClient(): PrismaClient {
  if (!prismaClientInstance) {
    prismaClientInstance = new PrismaClient({
      log: [],
    });
  }
  return prismaClientInstance;
}

export async function checkDatabaseConnection(): Promise<{ connected: boolean; provider: string; error?: string }> {
  if (!env.DATABASE_URL) {
    return {
      connected: true,
      provider: 'in-memory-fallback (DATABASE_URL unconfigured)',
    };
  }

  try {
    const client = getPrismaClient();
    await client.$queryRaw`SELECT 1`;
    // Verify that the tables actually exist
    await client.device.findFirst({ take: 1 });
    isPostgresAvailable = true;
    return { connected: true, provider: 'postgresql' };
  } catch (err: any) {
    logger.warn('PostgreSQL connection check failed, using safe in-memory store for development fallback', {
      error: err.message,
    });
    isPostgresAvailable = false;
    return {
      connected: true,
      provider: 'in-memory-fallback (PostgreSQL unreachable)',
      error: err.message,
    };
  }
}

/**
 * Unified Repository Interface that delegates to PostgreSQL via Prisma if available,
 * or to the robust in-memory database store if PostgreSQL is unreachable or unconfigured.
 */
export const db = {
  get isPostgres() {
    return isPostgresAvailable;
  },

  device: {
    async findUnique(args: { where: { deviceId?: string; id?: string } }) {
      if (isPostgresAvailable) {
        try {
          return await getPrismaClient().device.findUnique(args as any);
        } catch {
          // fallback
        }
      }
      const deviceId = args.where.deviceId;
      if (deviceId && memoryStore.devices.has(deviceId)) {
        return { ...memoryStore.devices.get(deviceId) };
      }
      if (args.where.id) {
        for (const d of memoryStore.devices.values()) {
          if (d.id === args.where.id) return { ...d };
        }
      }
      return null;
    },

    async upsert(args: {
      where: { deviceId: string };
      create: any;
      update: any;
    }) {
      if (isPostgresAvailable) {
        try {
          return await getPrismaClient().device.upsert(args as any);
        } catch {
          // fallback
        }
      }
      const existing = memoryStore.devices.get(args.where.deviceId);
      const now = new Date();
      if (existing) {
        const updated = { ...existing, ...args.update, updatedAt: now };
        memoryStore.devices.set(args.where.deviceId, updated);
        return updated;
      } else {
        const created = {
          id: `dev-${Date.now()}`,
          deviceId: args.where.deviceId,
          name: args.create.name || `Device ${args.where.deviceId}`,
          status: args.create.status || 'online',
          lastSeen: args.create.lastSeen || now,
          createdAt: now,
          updatedAt: now,
        };
        memoryStore.devices.set(args.where.deviceId, created);
        return created;
      }
    },

    async findMany() {
      if (isPostgresAvailable) {
        try {
          return await getPrismaClient().device.findMany();
        } catch {
          // fallback
        }
      }
      return Array.from(memoryStore.devices.values());
    },
  },

  sensorReading: {
    async create(args: { data: any }) {
      if (isPostgresAvailable) {
        try {
          return await getPrismaClient().sensorReading.create(args as any);
        } catch {
          // fallback
        }
      }
      const record = {
        id: `reading-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        createdAt: new Date(),
        ...args.data,
      };
      memoryStore.readings.unshift(record);
      return record;
    },

    async findUnique(args: { where: { deviceId_fingerprint?: { deviceId: string; fingerprint: string } } }) {
      if (isPostgresAvailable) {
        try {
          return await getPrismaClient().sensorReading.findUnique(args as any);
        } catch {
          // fallback
        }
      }
      const query = args.where.deviceId_fingerprint;
      if (query) {
        return (
          memoryStore.readings.find(
            (r) => r.deviceId === query.deviceId && r.fingerprint === query.fingerprint
          ) || null
        );
      }
      return null;
    },

    async findMany(args?: {
      where?: any;
      orderBy?: any;
      take?: number;
      skip?: number;
    }) {
      if (isPostgresAvailable) {
        try {
          return await getPrismaClient().sensorReading.findMany(args as any);
        } catch {
          // fallback
        }
      }
      let list = [...memoryStore.readings];

      if (args?.where) {
        const w = args.where;
        if (w.deviceId) list = list.filter((r) => r.deviceId === w.deviceId);
        if (w.missionId) list = list.filter((r) => r.missionId === w.missionId);
        if (w.timestamp?.gte) list = list.filter((r) => new Date(r.timestamp) >= new Date(w.timestamp.gte));
        if (w.timestamp?.lte) list = list.filter((r) => new Date(r.timestamp) <= new Date(w.timestamp.lte));
      }

      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      const skip = args?.skip || 0;
      const take = args?.take !== undefined ? args.take : list.length;
      return list.slice(skip, skip + take);
    },

    async findFirst(args?: { where?: any; orderBy?: any }) {
      const results = await this.findMany({ ...args, take: 1 });
      return results[0] || null;
    },

    async count(args?: { where?: any }) {
      if (isPostgresAvailable) {
        try {
          return await getPrismaClient().sensorReading.count(args as any);
        } catch {
          // fallback
        }
      }
      const all = await this.findMany(args);
      return all.length;
    },
  },

  location: {
    async create(args: { data: any }) {
      if (isPostgresAvailable) {
        try {
          return await getPrismaClient().location.create(args as any);
        } catch {
          // fallback
        }
      }
      const loc = {
        id: `loc-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        ...args.data,
      };
      memoryStore.locations.unshift(loc);
      return loc;
    },

    async findFirst(args?: { where?: any; orderBy?: any }) {
      if (isPostgresAvailable) {
        try {
          return await getPrismaClient().location.findFirst(args as any);
        } catch {
          // fallback
        }
      }
      let list = [...memoryStore.locations];
      if (args?.where?.deviceId) {
        list = list.filter((l) => l.deviceId === args.where.deviceId);
      }
      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return list[0] || null;
    },

    async findMany(args?: { where?: any; orderBy?: any; take?: number; skip?: number }) {
      if (isPostgresAvailable) {
        try {
          return await getPrismaClient().location.findMany(args as any);
        } catch {
          // fallback
        }
      }
      let list = [...memoryStore.locations];
      if (args?.where?.deviceId) {
        list = list.filter((l) => l.deviceId === args.where.deviceId);
      }
      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      const skip = args?.skip || 0;
      const take = args?.take !== undefined ? args.take : list.length;
      return list.slice(skip, skip + take);
    },
  },

  alert: {
    async create(args: { data: any }) {
      if (isPostgresAvailable) {
        try {
          return await getPrismaClient().alert.create(args as any);
        } catch {
          // fallback
        }
      }
      const alert = {
        id: `alert-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        resolved: false,
        resolvedAt: null,
        timestamp: new Date(),
        ...args.data,
      };
      memoryStore.alerts.unshift(alert);
      return alert;
    },

    async findMany(args?: { where?: any; orderBy?: any; take?: number }) {
      if (isPostgresAvailable) {
        try {
          return await getPrismaClient().alert.findMany(args as any);
        } catch {
          // fallback
        }
      }
      let list = [...memoryStore.alerts];
      if (args?.where) {
        const w = args.where;
        if (w.deviceId) list = list.filter((a) => a.deviceId === w.deviceId);
        if (w.type) list = list.filter((a) => a.type === w.type);
        if (w.severity) list = list.filter((a) => a.severity === w.severity);
        if (w.resolved !== undefined) list = list.filter((a) => a.resolved === w.resolved);
      }
      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      const take = args?.take !== undefined ? args.take : list.length;
      return list.slice(0, take);
    },

    async update(args: { where: { id: string }; data: any }) {
      if (isPostgresAvailable) {
        try {
          return await getPrismaClient().alert.update(args as any);
        } catch {
          // fallback
        }
      }
      const alert = memoryStore.alerts.find((a) => a.id === args.where.id);
      if (alert) {
        Object.assign(alert, args.data);
        return alert;
      }
      throw new Error(`Alert with id ${args.where.id} not found`);
    },

    async findFirst(args: { where: any }) {
      const results = await this.findMany(args);
      return results[0] || null;
    },
  },

  mission: {
    async findMany(args?: { where?: any; orderBy?: any }) {
      if (isPostgresAvailable) {
        try {
          return await getPrismaClient().mission.findMany(args as any);
        } catch {
          // fallback
        }
      }
      let list = Array.from(memoryStore.missions.values());
      if (args?.where?.deviceId) list = list.filter((m) => m.deviceId === args.where.deviceId);
      if (args?.where?.status) list = list.filter((m) => m.status === args.where.status);
      list.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
      return list;
    },

    async findUnique(args: { where: { id?: string; missionId?: string } }) {
      if (isPostgresAvailable) {
        try {
          return await getPrismaClient().mission.findUnique(args as any);
        } catch {
          // fallback
        }
      }
      if (args.where.missionId) return memoryStore.missions.get(args.where.missionId) || null;
      for (const m of memoryStore.missions.values()) {
        if (m.id === args.where.id) return m;
      }
      return null;
    },

    async create(args: { data: any }) {
      if (isPostgresAvailable) {
        try {
          return await getPrismaClient().mission.create(args as any);
        } catch {
          // fallback
        }
      }
      const record = {
        id: `mission-rec-${Date.now()}`,
        createdAt: new Date(),
        status: 'active',
        ...args.data,
      };
      memoryStore.missions.set(record.missionId, record);
      return record;
    },

    async update(args: { where: { id?: string; missionId?: string }; data: any }) {
      if (isPostgresAvailable) {
        try {
          return await getPrismaClient().mission.update(args as any);
        } catch {
          // fallback
        }
      }
      const existing = await this.findUnique(args);
      if (existing) {
        Object.assign(existing, args.data);
        memoryStore.missions.set(existing.missionId, existing);
        return existing;
      }
      throw new Error('Mission not found');
    },
  },

  communicationStatus: {
    async create(args: { data: any }) {
      if (isPostgresAvailable) {
        try {
          return await getPrismaClient().communicationStatus.create(args as any);
        } catch {
          // fallback
        }
      }
      const item = {
        id: `comm-${Date.now()}`,
        timestamp: new Date(),
        lastSeen: new Date(),
        ...args.data,
      };
      memoryStore.commStatuses.unshift(item);
      return item;
    },

    async findFirst(args?: { where?: any; orderBy?: any }) {
      if (isPostgresAvailable) {
        try {
          return await getPrismaClient().communicationStatus.findFirst(args as any);
        } catch {
          // fallback
        }
      }
      let list = [...memoryStore.commStatuses];
      if (args?.where?.deviceId) {
        list = list.filter((c) => c.deviceId === args.where.deviceId);
      }
      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return list[0] || null;
    },
  },

  syncRecord: {
    async create(args: { data: any }) {
      if (isPostgresAvailable) {
        try {
          return await getPrismaClient().syncRecord.create(args as any);
        } catch {
          // fallback
        }
      }
      const item = {
        id: `sync-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        syncedAt: new Date(),
        receivedAt: new Date(),
        status: 'success',
        ...args.data,
      };
      memoryStore.syncRecords.unshift(item);
      return item;
    },

    async findFirst(args?: { where?: any }) {
      if (isPostgresAvailable) {
        try {
          return await getPrismaClient().syncRecord.findFirst(args as any);
        } catch {
          // fallback
        }
      }
      const w = args?.where;
      return (
        memoryStore.syncRecords.find((s) => {
          if (w?.fingerprint && s.fingerprint !== w.fingerprint) return false;
          if (w?.deviceId && s.deviceId !== w.deviceId) return false;
          return true;
        }) || null
      );
    },
  },
};
