/** Shared validation for creating a farm (farmer onboarding and installer registration). */
import { z } from "zod";
import { LAND_UNITS } from "@/lib/engine/landUnits";

export const DISTRICTS = [
  { name: "Sheikhupura", lat: 31.71, lng: 73.98, typicalDepthFt: 90 },
  { name: "Gujranwala", lat: 32.16, lng: 74.19, typicalDepthFt: 85 },
  { name: "Hafizabad", lat: 32.07, lng: 73.69, typicalDepthFt: 100 },
  { name: "Narowal", lat: 32.1, lng: 74.87, typicalDepthFt: 70 },
  { name: "Sargodha", lat: 32.08, lng: 72.67, typicalDepthFt: 140 },
  { name: "Okara", lat: 30.81, lng: 73.45, typicalDepthFt: 130 },
  { name: "Kasur", lat: 31.12, lng: 74.45, typicalDepthFt: 120 },
  { name: "Lahore", lat: 31.52, lng: 74.36, typicalDepthFt: 150 },
  { name: "Faisalabad", lat: 31.42, lng: 73.08, typicalDepthFt: 110 },
  { name: "Sialkot", lat: 32.49, lng: 74.53, typicalDepthFt: 60 },
] as const;

export const TYPICAL_PUMP = { ratedKw: 11, pvKwp: 14 };

export const FarmCreate = z.object({
  district: z.string().trim().min(2).max(40),
  tehsil: z.string().trim().max(40).optional(),
  lat: z.number().min(23.5).max(37.5),
  lng: z.number().min(60.5).max(77.9),
  cropType: z.enum(["wheat", "rice", "maize", "cotton", "sugarcane"]),
  sowingDate: z.coerce.date().refine((d) => d.getTime() < Date.now() + 86_400_000 && d.getTime() > Date.now() - 400 * 86_400_000, "sowing date must be within the last ~13 months"),
  areaAcres: z.number().min(0.5).max(500),
  /** How the farmer thinks of his land; areaAcres is the stored value, already converted. */
  areaUnit: z.enum(LAND_UNITS).default("acre"),
  irrigationMethod: z.enum(["flood", "furrow", "sprinkler", "drip"]),
  ratedKw: z.number().min(0.5).max(100),
  pvKwp: z.number().min(0.5).max(150),
  staticDepthFt: z.number().min(5).max(800),
  language: z.enum(["ur", "en"]).default("ur"),
  dataConsent: z.boolean().default(true),
  /** Installer registrations only: the farmer's account. */
  farmer: z
    .object({ name: z.string().trim().min(2).max(80), phone: z.string().min(10).max(20), pin: z.string().regex(/^\d{4,6}$/) })
    .optional(),
});
export type FarmCreateInput = z.infer<typeof FarmCreate>;
