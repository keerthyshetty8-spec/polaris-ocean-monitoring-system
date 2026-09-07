import { db } from '../src/config/database.js';
import { generateReadingFingerprint } from '../src/utils/fingerprint.js';

async function seed() {
  console.log('--- [POLARIS M4/M5 SEED] Initializing Development Seed Data ---');

  const deviceId = 'POLARIS-001';
  const missionId = 'MISSION-BAY-01';

  // 1. Seed Device
  const device = await db.device.upsert({
    where: { deviceId },
    create: {
      deviceId,
      name: 'POLARIS Ocean Buoy Alpha (Dev Seed)',
      status: 'online',
      lastSeen: new Date(),
    },
    update: {
      name: 'POLARIS Ocean Buoy Alpha (Dev Seed)',
      status: 'online',
      lastSeen: new Date(),
    },
  });
  console.log(`✓ Device seeded: ${device.deviceId}`);

  // 2. Seed Mission
  const now = new Date();
  const startTime = new Date(now.getTime() - 24 * 3600 * 1000); // 24 hours ago
  const mission = await db.mission.create({
    data: {
      missionId,
      deviceId,
      name: 'Coastal Water Quality & Thermocline Mapping',
      description: 'Development baseline mission for testing sensor telemetry, depth profiling, and alert generation.',
      startTime,
      status: 'active',
    },
  });
  console.log(`✓ Mission seeded: ${mission.missionId}`);

  // 3. Seed Chronological Historical Readings (20 points over last 24 hours)
  console.log('Generating 20 sample sensor readings...');
  const baseLat = 17.385;
  const baseLon = 78.4867;

  for (let i = 20; i >= 0; i--) {
    const readingTime = new Date(now.getTime() - i * 60 * 60 * 1000);
    const depth = parseFloat((5 + Math.sin(i / 2) * 15 + Math.random() * 2).toFixed(2));
    const temp = parseFloat((26.5 - depth * 0.15 + (Math.random() - 0.5)).toFixed(2));
    const pressure = parseFloat((1.01 + depth * 0.1).toFixed(2));
    const salinity = parseFloat((34.5 + Math.sin(i / 3) * 0.4).toFixed(2));
    const conductivity = parseFloat((4.8 + (Math.random() - 0.5) * 0.2).toFixed(2));
    const battery = Math.max(15, Math.min(100, Math.round(95 - (20 - i) * 1.2)));

    const fp = generateReadingFingerprint({
      deviceId,
      timestamp: readingTime,
      temperature: temp,
      pressure,
      depth,
      conductivity,
      salinity,
      battery,
    });

    await db.sensorReading.create({
      data: {
        deviceId,
        timestamp: readingTime,
        temperature: temp,
        pressure,
        depth,
        conductivity,
        salinity,
        atmosphericTemp: parseFloat((28.0 + Math.cos(i / 4) * 2).toFixed(2)),
        atmosphericPressure: 1012.4,
        atmosphericHumidity: 68.5,
        battery,
        batteryVoltage: 12.2,
        source: 'simulator',
        ingestionMethod: i % 2 === 0 ? 'mqtt' : 'http',
        fingerprint: fp,
        missionId,
      },
    });

    // Seed location drift
    const lat = baseLat + (20 - i) * 0.0012;
    const lon = baseLon + (20 - i) * 0.0009;
    await db.location.create({
      data: {
        deviceId,
        latitude: lat,
        longitude: lon,
        altitude: 0.0,
        speed: 1.1,
        timestamp: readingTime,
        missionId,
      },
    });
  }
  console.log('✓ 20 sensor readings and location points seeded');

  // 4. Seed Alerts
  await db.alert.create({
    data: {
      deviceId,
      type: 'ABNORMAL_TEMPERATURE',
      severity: 'warning',
      message: 'Abnormal water temperature spiked above nominal threshold during thermocline crossing (Dev Seed)',
      timestamp: new Date(now.getTime() - 6 * 3600 * 1000),
      resolved: true,
      resolvedAt: new Date(now.getTime() - 5 * 3600 * 1000),
    },
  });

  await db.alert.create({
    data: {
      deviceId,
      type: 'LOW_BATTERY',
      severity: 'warning',
      message: 'Battery level reached 19.5% threshold during nocturnal drift (Dev Seed)',
      timestamp: new Date(now.getTime() - 30 * 60 * 1000),
      resolved: false,
    },
  });
  console.log('✓ Sample alerts seeded');

  console.log('--- [POLARIS M4/M5 SEED] Seeding Completed Successfully ---');
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
