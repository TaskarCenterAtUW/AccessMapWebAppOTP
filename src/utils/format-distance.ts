import units from "constants/units";

export type UnitSystem = "imperial" | "metric";

const METERS_PER_MILE = 1609.344;

// Formats a distance in meters as feet / miles, or meters / kilometers.
const formatDistance = (
  meters: number,
  system: UnitSystem = "imperial",
  digits = 0
): string => {
  if (!Number.isFinite(meters) || meters <= 0) {
    return system === "imperial" ? "< 1 foot" : "< 1 meter";
  }
  if (system === "imperial") {
    if (meters >= METERS_PER_MILE) {
      return `${(meters / METERS_PER_MILE).toFixed(1)} miles`;
    }
    return `${(meters * units.feetPerMeter).toFixed(digits)} feet`;
  }
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${meters.toFixed(digits)} meters`;
};

export default formatDistance;
