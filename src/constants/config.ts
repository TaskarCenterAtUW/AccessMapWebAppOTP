import { FeatureCollection, MultiPolygon } from "geojson";

export interface RegionProperties {
  id: string;
  key: string;
  name: string;
  bounds: [number, number, number, number];
  lon: number;
  lat: number;
  zoom: number;
}

export type Regions = FeatureCollection<MultiPolygon, RegionProperties>;

/** What the app is deployed with, from /config.json. */
export interface AppConfig {
  maptilerKey: string;
  regions: Regions;
}

const config = {} as AppConfig;

/** Has to finish before anything that reads the config is imported, see index.tsx. */
export const loadConfig = async (): Promise<void> => {
  const response = await fetch("/config.json");
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  Object.assign(config, await response.json());
};

export default config;
