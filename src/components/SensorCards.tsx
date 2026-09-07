import React from 'react';
import {
  Thermometer,
  ArrowDown,
  Droplets,
  Zap,
  Gauge,
  Sun,
  CloudRain,
  BatteryCharging,
  BatteryWarning,
} from 'lucide-react';
import { SensorReading, DeviceBattery } from '../types';

interface SensorCardsProps {
  reading: SensorReading | null;
  batteryData?: DeviceBattery | null;
}

export const SensorCards: React.FC<SensorCardsProps> = ({ reading, batteryData }) => {
  if (!reading) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
        <div className="inline-flex p-3 rounded-full bg-slate-800/80 mb-3 text-cyan-400">
          <Droplets className="w-6 h-6 animate-pulse" />
        </div>
        <h4 className="text-sm font-semibold text-slate-200">Awaiting Sensor Telemetry</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          No oceanographic telemetry frame received yet. The system will automatically update when an ESP32 transmission arrives.
        </p>
      </div>
    );
  }

  // Extract atmospheric fields (supports both flat and nested payload structures)
  const atmTemp = reading.atmosphericTemp ?? reading.atmospheric?.temperature ?? null;
  const atmPressure = reading.atmosphericPressure ?? reading.atmospheric?.pressure ?? null;
  const atmHumidity = reading.atmosphericHumidity ?? reading.atmospheric?.humidity ?? null;

  // Battery fallback
  const batteryPct = reading.battery ?? batteryData?.level ?? null;
  const batteryVolt = reading.batteryVoltage ?? batteryData?.voltage ?? null;
  const isLowBatt = (batteryPct !== null && batteryPct <= 20) || (batteryData?.isLow ?? false);

  const cards = [
    {
      id: 'water-temp',
      title: 'Water Temperature',
      value: reading.temperature !== null && reading.temperature !== undefined ? `${reading.temperature.toFixed(2)} °C` : 'N/A',
      sub: 'Marine Thermistor',
      icon: Thermometer,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
    },
    {
      id: 'ocean-depth',
      title: 'Ocean Depth',
      value: reading.depth !== null && reading.depth !== undefined ? `${reading.depth.toFixed(2)} m` : 'N/A',
      sub: reading.pressure !== null && reading.pressure !== undefined ? `Pressure: ${reading.pressure.toFixed(2)} bar` : 'Hydrostatic Column',
      icon: ArrowDown,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/20',
    },
    {
      id: 'salinity',
      title: 'Salinity',
      value: reading.salinity !== null && reading.salinity !== undefined ? `${reading.salinity.toFixed(2)} PSU` : 'N/A',
      sub: 'Practical Salinity Scale',
      icon: Droplets,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
    },
    {
      id: 'conductivity',
      title: 'Conductivity',
      value: reading.conductivity !== null && reading.conductivity !== undefined ? `${reading.conductivity.toFixed(2)} mS/cm` : 'N/A',
      sub: 'Electrolytic Sensor',
      icon: Zap,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
    },
    {
      id: 'atm-pressure',
      title: 'Atmospheric Pressure',
      value: atmPressure !== null ? `${atmPressure.toFixed(1)} hPa` : 'N/A',
      sub: 'Surface Barometer',
      icon: Gauge,
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/20',
    },
    {
      id: 'air-temp',
      title: 'Air Temperature',
      value: atmTemp !== null ? `${atmTemp.toFixed(1)} °C` : 'N/A',
      sub: 'Surface Mast Sensor',
      icon: Sun,
      color: 'text-orange-400',
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/20',
    },
    {
      id: 'humidity',
      title: 'Relative Humidity',
      value: atmHumidity !== null ? `${atmHumidity.toFixed(0)}%` : 'N/A',
      sub: 'Atmospheric Vapor',
      icon: CloudRain,
      color: 'text-teal-400',
      bg: 'bg-teal-500/10',
      border: 'border-teal-500/20',
    },
    {
      id: 'battery-power',
      title: 'Battery Percentage',
      value: batteryPct !== null ? `${batteryPct}%` : 'N/A',
      sub: batteryVolt !== null ? `Pack Voltage: ${batteryVolt.toFixed(2)} V` : 'Power Subsystem',
      icon: isLowBatt ? BatteryWarning : BatteryCharging,
      color: isLowBatt ? 'text-rose-400' : 'text-emerald-400',
      bg: isLowBatt ? 'bg-rose-500/10' : 'bg-emerald-500/10',
      border: isLowBatt ? 'border-rose-500/30' : 'border-emerald-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2.5 sm:gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            id={card.id}
            className={`bg-slate-900 border ${card.border} rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700 transition shadow-sm`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium text-slate-400 truncate">{card.title}</span>
              <div className={`p-1.5 rounded-md ${card.bg} ${card.color} shrink-0`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <div className="text-lg sm:text-xl font-bold text-white tracking-tight font-mono">
                {card.value}
              </div>
              <div className="text-[10px] text-slate-400 mt-1 truncate">
                {card.sub}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

