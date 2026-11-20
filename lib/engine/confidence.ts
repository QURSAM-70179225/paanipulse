/**
 * How far to trust today's advice. Pure.
 * PaaniPulse is open loop: it advises, the farmer acts. So the app must say when its inputs are weak,
 * and never present a rough estimate as a precise one.
 */
export type ConfidenceLevel = "high" | "medium" | "low";
export type ConfidenceReason = "weather-sample" | "weather-cached" | "weather-estimated" | "pump-uncalibrated" | "hours-missing" | "rain-forecast";

export interface ConfidenceInput {
  /** Where the weather came from: live Open-Meteo, a saved copy, OpenWeather (estimated ET₀), or offline sample data. */
  weatherSource: "live" | "cached-live" | "openweather" | "sample";
  pumpCalibrated: boolean;
  /** Pump-drive telemetry replaces the sunlight estimate, so calibration matters less. */
  hasTelemetry: boolean;
  /** Yesterday's run-hours were reported (or measured). Without them the soil balance assumes no irrigation. */
  hoursReported: boolean;
  /** Forecast rain was close to the need but not trusted enough to skip (advice leans on a forecast). */
  rainForecastInvolved: boolean;
}

export interface Confidence {
  level: ConfidenceLevel;
  reasons: ConfidenceReason[];
}

export function adviceConfidence(i: ConfidenceInput): Confidence {
  const reasons: ConfidenceReason[] = [];
  if (i.weatherSource === "sample") reasons.push("weather-sample");
  else if (i.weatherSource === "cached-live") reasons.push("weather-cached");
  else if (i.weatherSource === "openweather") reasons.push("weather-estimated");
  if (!i.pumpCalibrated && !i.hasTelemetry) reasons.push("pump-uncalibrated");
  if (!i.hoursReported && !i.hasTelemetry) reasons.push("hours-missing");
  if (i.rainForecastInvolved) reasons.push("rain-forecast");
  // Offline sample weather is not real data: always low. Any other weakness: medium.
  const level: ConfidenceLevel = reasons.includes("weather-sample") ? "low" : reasons.length ? "medium" : "high";
  return { level, reasons };
}
