import bbox from "@turf/bbox";
import { FeatureCollection, LineString } from "geojson";

import { RouteResult } from "types";

const routeBounds = (
  routeResult: RouteResult
): [number, number, number, number] => {
  // Coordinates of the origin/destination pair
  const [ox, oy] = routeResult.origin.geometry.coordinates;
  const [ex, ey] = routeResult.destination.geometry.coordinates;

  const legs = routeResult.itinerary.legs.filter(
    (leg) => leg.geometry.coordinates.length > 0
  );
  if (legs.length === 0) {
    return [
      Math.min(ox, ex),
      Math.min(oy, ey),
      Math.max(ox, ex),
      Math.max(oy, ey),
    ];
  }

  // Bounding box of the on-network route path, all legs (walk and transit)
  const legsCollection: FeatureCollection<LineString> = {
    type: "FeatureCollection",
    features: legs.map((leg) => ({
      type: "Feature",
      geometry: leg.geometry,
      properties: {},
    })),
  };
  const bboxBounds = bbox(legsCollection);

  // Adjust the bounding box to include the origin or destination if they fall
  // outside of the on-network route bounding box.
  return [
    Math.min(bboxBounds[0], ox, ex),
    Math.min(bboxBounds[1], oy, ey),
    Math.max(bboxBounds[2], ox, ex),
    Math.max(bboxBounds[3], oy, ey),
  ];
};

export default routeBounds;
