import config from "constants/config";

const MAPTILER_GEOCODING_URL = "https://api.maptiler.com/geocoding";

type BboxType = [number, number, number, number];
interface Proximity {
  longitude: number;
  latitude: number;
}

interface GeocoderResult {
  name: string;
  location: number[];
}

type GeocoderCallback = (geocoded: GeocoderResult[]) => void;

const geocode = (
  value: string,
  bbox: BboxType = null,
  proximity: Proximity = null,
  callback: GeocoderCallback
): void => {
  if (!value) {
    return;
  }

  // TODO: set country code from region
  const params = new URLSearchParams({ key: config.maptilerKey });
  if (proximity) {
    params.set("proximity", `${proximity.longitude},${proximity.latitude}`);
  }
  if (bbox) {
    // [minLon, minLat, maxLon, maxLat]
    params.set("bbox", bbox.join(","));
  }

  const url = `${MAPTILER_GEOCODING_URL}/${encodeURIComponent(
    value
  )}.json?${params.toString()}`;

  fetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Geocoding request failed: ${response.status}`);
      }
      return response.json();
    })
    .then((results) => {
      const features = (results && results.features) || [];
      const places: GeocoderResult[] = features
        .filter((d) => d.center && d.center.length >= 2)
        .map((d) => ({
          name: d.place_name || d.text,
          location: { longitude: d.center[0], latitude: d.center[1] },
        }));
      callback(places);
    })
    .catch((error) => {
      console.warn(error);
    });
};

export default geocode;
