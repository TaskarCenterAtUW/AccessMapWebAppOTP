import React from "react";

import { Source } from "react-map-gl";

// Sidewalk / crossing vector tiles served by OpenTripPlanner (proxied by the
// dev server under /api/v1/routing). Beyond maxzoom the map overzooms.
const PEDESTRIAN_TILES_URL = `${window.location.origin}/api/v1/routing/otp/routers/default/vectorTiles/transportation/{z}/{x}/{y}.pbf`;

const PedestrianSource = () => (
  <Source
    id="pedestrian"
    type="vector"
    tiles={[PEDESTRIAN_TILES_URL]}
    minzoom={13}
    maxzoom={18}
  />
);

export default PedestrianSource;
