import React from "react";
import { Layer, Source } from "react-map-gl";
import { Feature, FeatureCollection } from "geojson";

import { useAppSelector } from "hooks";
import { TransitLeg } from "types";

// Line color for transit routes that don't specify one
const TRANSIT_FALLBACK_COLOR = "#333333";

// The color of the line a route is drawn in. A dark border sets it apart from
// the incline colors of the sidewalks beneath it.
const transitColor = (leg: TransitLeg): string =>
  (leg.route && leg.route.color) || TRANSIT_FALLBACK_COLOR;

// The color of the border of the lines of an itinerary
const BORDER_COLOR = "#1a1a1a";

interface Props {
  // The layer to draw the route beneath, such as the base map's labels
  beforeId?: string;
}

const RouteLayers = ({ beforeId }: Props) => {
  const { routeResult } = useAppSelector((state) => state.directions);

  const legs = routeResult.itinerary.legs.filter(
    (leg) => leg.geometry.coordinates.length > 0
  );

  const walkPaths: FeatureCollection = {
    type: "FeatureCollection",
    features: legs
      .filter((leg) => leg.type === "walk")
      .map((leg) => ({
        type: "Feature",
        geometry: leg.geometry,
        properties: {},
      })),
  };

  const transitLegs = legs.filter(
    (leg): leg is TransitLeg => leg.type === "transit"
  );

  const transitPaths: FeatureCollection = {
    type: "FeatureCollection",
    features: transitLegs.map((leg) => ({
      type: "Feature",
      geometry: leg.geometry,
      properties: {
        color: transitColor(leg),
      },
    })),
  };

  // Board and alight stops of each transit leg
  const transitStops: FeatureCollection = {
    type: "FeatureCollection",
    features: transitLegs.reduce((features, leg) => {
      const color = transitColor(leg);
      [leg.from, leg.to].forEach((place, i) => {
        features.push({
          type: "Feature",
          geometry: { type: "Point", coordinates: [place.lon, place.lat] },
          properties: {
            color,
            name: place.name,
            stop: i === 0 ? "board" : "alight",
          },
        });
      });
      return features;
    }, [] as Feature[]),
  };

  const routeJogs: FeatureCollection = {
    type: "FeatureCollection",
    features:
      legs.length === 0
        ? []
        : [
            {
              type: "Feature",
              geometry: {
                type: "LineString",
                coordinates: [
                  routeResult.origin.geometry.coordinates,
                  legs[0].geometry.coordinates[0],
                ],
              },
              properties: {
                waypoint: "origin",
              },
            },
            {
              type: "Feature",
              geometry: {
                type: "LineString",
                coordinates: [
                  legs[legs.length - 1].geometry.coordinates.slice(-1)[0],
                  routeResult.destination.geometry.coordinates,
                ],
              },
              properties: {
                waypoint: "destination",
              },
            },
          ],
  };

  return (
    <>
      <Source id="route-jogs" type="geojson" data={routeJogs}>
        <Layer
          id="route-jogs"
          type="line"
          layout={{ "line-cap": "round" }}
          paint={{
            "line-color": "black",
            "line-opacity": 0.6,
            "line-width": {
              stops: [
                [12, 0.2],
                [16, 3],
                [22, 30],
              ],
            },

            "line-dasharray": [0, 2],
          }}
          beforeId={beforeId}
        />
      </Source>
      <Source id="route-path" type="geojson" data={walkPaths}>
        <Layer
          id="route-path-outline"
          type="line"
          layout={{
            "line-cap": "round",
            "line-join": "round",
          }}
          paint={{
            "line-color": BORDER_COLOR,
            "line-width": {
              stops: [
                [12, 8],
                [16, 17],
                [22, 100],
              ],
            },
          }}
          beforeId={beforeId}
        />
        <Layer
          id="route-path"
          type="line"
          layout={{
            "line-cap": "round",
            "line-join": "round",
          }}
          paint={{
            "line-color": "#4bf",
            "line-width": {
              stops: [
                [12, 5],
                [16, 12],
                [22, 92],
              ],
            },
          }}
          beforeId={beforeId}
        />
      </Source>
      <Source id="route-transit-path" type="geojson" data={transitPaths}>
        <Layer
          id="route-transit-path-outline"
          type="line"
          layout={{
            "line-cap": "round",
            "line-join": "round",
          }}
          paint={{
            "line-color": BORDER_COLOR,
            "line-width": {
              stops: [
                [12, 7],
                [16, 13],
                [22, 48],
              ],
            },
          }}
          beforeId={beforeId}
        />
        <Layer
          id="route-transit-path"
          type="line"
          layout={{
            "line-cap": "round",
            "line-join": "round",
          }}
          paint={{
            "line-color": ["get", "color"],
            "line-width": {
              stops: [
                [12, 4],
                [16, 8],
                [22, 40],
              ],
            },
          }}
          beforeId={beforeId}
        />
      </Source>
      <Source id="route-transit-stops" type="geojson" data={transitStops}>
        <Layer
          id="route-transit-stops"
          type="circle"
          paint={{
            "circle-color": "white",
            "circle-stroke-color": ["get", "color"],
            "circle-radius": {
              stops: [
                [12, 4],
                [16, 7],
                [22, 20],
              ],
            },
            "circle-stroke-width": {
              stops: [
                [12, 2],
                [16, 3],
                [22, 6],
              ],
            },
          }}
          beforeId={beforeId}
        />
      </Source>
    </>
  );
};

export default RouteLayers;
