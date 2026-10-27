// Decodes a Google encoded polyline
// (https://developers.google.com/maps/documentation/utilities/polylinealgorithm)
// into GeoJSON-ordered [lon, lat] coordinates.
const decodePolyline = (
  encoded: string,
  precision: number = 5
): [number, number][] => {
  const coordinates: [number, number][] = [];
  if (!encoded) return coordinates;

  const factor = Math.pow(10, precision);
  let index = 0;
  let lat = 0;
  let lon = 0;

  const nextValue = (): number => {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };

  while (index < encoded.length) {
    lat += nextValue();
    lon += nextValue();
    coordinates.push([lon / factor, lat / factor]);
  }

  return coordinates;
};

export default decodePolyline;
