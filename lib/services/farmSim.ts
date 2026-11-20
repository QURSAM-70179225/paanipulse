/** Glue between DB records and the pure engine. */
import type { Farm, Pump } from "@prisma/client";
import { pktDateKey } from "@/lib/dates";
import { simulateFarm, type CropType, type FarmInput, type IrrigationMethod, type WeatherDay } from "@/lib/engine";

export function toFarmInput(farm: Farm, pump: Pump): FarmInput {
  return {
    crop: farm.cropType as CropType,
    sowingDate: pktDateKey(farm.sowingDate),
    areaAcres: farm.areaAcres,
    irrigationMethod: farm.irrigationMethod as IrrigationMethod,
    soilType: farm.soilType,
    maturity: farm.maturity,
    lat: farm.lat,
    pump: {
      ratedKw: pump.ratedKw,
      pvKwp: pump.pvKwp,
      staticDepthFt: pump.staticDepthFt,
      drawdownM: pump.drawdownM,
      efficiency: pump.efficiency,
      calibrated: pump.calibrated,
    },
  };
}

export function runFarm(farm: Farm, pump: Pump, hours: Record<string, number>, weather: WeatherDay[], todayKey: string, opts: { weatherReliable?: boolean } = {}) {
  return simulateFarm(toFarmInput(farm, pump), weather, hours, todayKey, 0, opts);
}
