import { Feature, LineString, Point } from "geojson";

import {
  Leg,
  PedestrianSegment,
  RouteResult,
  TransitLeg,
  TripPlace,
  WalkLeg,
} from "types";
import { Profile } from "profiles/profiles";
import { Waypoint } from "features/waypoints/waypoints-slice";
import { TripOptionsState } from "features/trip-options/trip-options-slice";
import decodePolyline from "utils/decode-polyline";
import { toOffsetDateTime } from "utils/trip-time";

export interface DirectionsOptions {
  origin: Waypoint;
  destination: Waypoint;
  profile: Profile;
  tripOptions: TripOptionsState;
  signal?: AbortSignal;
}

// "Ok" carries the result; any other code carries a readable message.
export type DirectionsResponse =
  | { code: "Ok"; routeResult: RouteResult }
  | {
      code:
        | "Error"
        | "NoRoute"
        | "LocationNotFound"
        | "OutsideServicePeriod"
        | "OutsideBounds";
      message: string;
    };

export const PLAN_QUERY = `query AccessMapPlan(
  $origin: PlanLabeledLocationInput!
  $destination: PlanLabeledLocationInput!
  $dateTime: PlanDateTimeInput
  $modes: PlanModesInput
  $preferences: PlanPreferencesInput
) {
  planConnection(
    origin: $origin
    destination: $destination
    dateTime: $dateTime
    modes: $modes
    preferences: $preferences
    first: 1
  ) {
    routingErrors {
      code
      description
      inputField
    }
    edges {
      node {
        start
        end
        duration
        numberOfTransfers
        walkDistance
        legs {
          mode
          start {
            scheduledTime
          }
          end {
            scheduledTime
          }
          duration
          distance
          from {
            ...place
          }
          to {
            ...place
          }
          legGeometry {
            points
          }
          headsign
          intermediatePlaces {
            name
          }
          route {
            shortName
            longName
            color
            textColor
          }
          agency {
            name
          }
          pedestrianSegments {
            geometry {
              points
            }
            distance
            highway
            footway
            name
            description
            incline
            curbRamps
            elevator
            indoor
            surface
            pathwayMode
            fromLevel
            toLevel
            levelChange
          }
        }
      }
    }
  }
}

fragment place on Place {
  name
  lat
  lon
  stop {
    gtfsId
    name
    code
  }
}`;

const WHEELCHAIR_PROFILES = ["wheelchair", "powered"];

// Trips are planned on the OpenSidewalks data, not on other street data such as
// OpenStreetMap that the server may also have.
const STREET_NETWORK = "OPEN_SIDEWALKS";

export const planVariables = (options: DirectionsOptions) => {
  const { origin, destination, profile, tripOptions } = options;

  return {
    origin: {
      location: {
        coordinate: { latitude: origin.lat, longitude: origin.lon },
      },
    },
    destination: {
      location: {
        coordinate: { latitude: destination.lat, longitude: destination.lon },
      },
    },
    dateTime: { earliestDeparture: toOffsetDateTime(tripOptions.dateTime) },
    modes: {
      direct: ["WALK"],
      transit: { access: ["WALK"], egress: ["WALK"], transfer: ["WALK"] },
    },
    preferences: {
      street: {
        network: STREET_NETWORK,
        walk: {
          speed: profile.speed,
          pedestrianCost: [
            { name: "uphill", value: String(profile.uphillMax) },
            { name: "downhill", value: String(Math.abs(profile.downhillMax)) },
            { name: "avoid_curbs", value: String(profile.avoidCurbs) },
            {
              name: "street_avoidance",
              value: String(profile.streetAvoidance),
            },
          ],
        },
      },
      accessibility: {
        wheelchair: { enabled: WHEELCHAIR_PROFILES.includes(profile.id) },
      },
    },
  };
};

const lineString = (encoded: string | null | undefined): LineString => ({
  type: "LineString",
  coordinates: decodePolyline(encoded || ""),
});

const point = (lon: number, lat: number): Feature<Point> => ({
  type: "Feature",
  geometry: { type: "Point", coordinates: [lon, lat] },
  properties: {},
});

const hexColor = (color: string | null | undefined): string | null => {
  if (!color) return null;
  return color.startsWith("#") ? color : `#${color}`;
};

const toPlace = (place: any): TripPlace => ({
  name: place?.name ?? null,
  lon: place?.lon,
  lat: place?.lat,
  stop: place?.stop
    ? {
        gtfsId: place.stop.gtfsId,
        name: place.stop.name ?? null,
        code: place.stop.code ?? null,
      }
    : null,
});

const toSegment = (s: any): PedestrianSegment => ({
  geometry: lineString(s?.geometry?.points),
  distance: s?.distance ?? null,
  highway: s?.highway ?? null,
  footway: s?.footway ?? null,
  name: s?.name ?? null,
  description: s?.description ?? null,
  incline: s?.incline ?? null,
  curbRamps: s?.curbRamps ?? null,
  elevator: s?.elevator ?? null,
  indoor: s?.indoor ?? null,
  surface: s?.surface ?? null,
  pathwayMode: s?.pathwayMode ?? null,
  fromLevel: s?.fromLevel ?? null,
  toLevel: s?.toLevel ?? null,
  levelChange: s?.levelChange ?? null,
});

const toLeg = (leg: any): Leg => {
  const base = {
    mode: leg.mode,
    startTime: leg.start?.scheduledTime ?? null,
    endTime: leg.end?.scheduledTime ?? null,
    duration: leg.duration ?? 0,
    distance: leg.distance ?? 0,
    from: toPlace(leg.from),
    to: toPlace(leg.to),
    geometry: lineString(leg.legGeometry?.points),
  };

  if (leg.mode === "WALK") {
    const walkLeg: WalkLeg = {
      ...base,
      type: "walk",
      segments: (leg.pedestrianSegments || []).filter(Boolean).map(toSegment),
    };
    return walkLeg;
  }

  const transitLeg: TransitLeg = {
    ...base,
    type: "transit",
    headsign: leg.headsign ?? null,
    route: leg.route
      ? {
          shortName: leg.route.shortName ?? null,
          longName: leg.route.longName ?? null,
          color: hexColor(leg.route.color),
          textColor: hexColor(leg.route.textColor),
        }
      : null,
    agencyName: leg.agency?.name ?? null,
    intermediateStopCount: (leg.intermediatePlaces || []).length,
  };
  return transitLeg;
};

const routingErrorResponse = (
  routingErrors: { code: string; description: string; inputField?: string }[]
): DirectionsResponse => {
  const error = routingErrors[0];
  switch (error.code) {
    case "LOCATION_NOT_FOUND": {
      let which = "The origin or destination is";
      if (error.inputField === "FROM") which = "The origin is";
      if (error.inputField === "TO") which = "The destination is";
      return {
        code: "LocationNotFound",
        message: `${which} too far from the sidewalk network`,
      };
    }
    case "OUTSIDE_SERVICE_PERIOD":
      return {
        code: "OutsideServicePeriod",
        message: "The trip date is outside the transit service period",
      };
    case "OUTSIDE_BOUNDS":
      return {
        code: "OutsideBounds",
        message: "The trip is outside the area AccessMap covers",
      };
    case "NO_TRANSIT_CONNECTION":
    case "NO_TRANSIT_CONNECTION_IN_SEARCH_WINDOW":
    case "NO_DIRECT_MODE_CONNECTION":
    case "NO_STOPS_IN_RANGE":
    case "WALKING_BETTER_THAN_TRANSIT":
    default:
      return { code: "NoRoute", message: "No Route" };
  }
};

const fetchDirections = async (
  options: DirectionsOptions
): Promise<DirectionsResponse> => {
  const { origin, destination } = options;

  const url = `${window.location.origin}/api/v1/routing/otp/gtfs/v1`;

  const fetchOptions: RequestInit = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: PLAN_QUERY,
      variables: planVariables(options),
    }),
  };
  if (options.signal !== undefined) {
    fetchOptions.signal = options.signal;
  }

  let response: Response;
  let body: any;
  try {
    response = await fetch(url, fetchOptions);
    if (!response.ok) {
      return { code: "Error", message: `HTTP Error: ${response.status}` };
    }
    body = await response.json();
  } catch (error) {
    // Let aborts propagate so the thunk knows the request was superseded
    if (error && error.name === "AbortError") throw error;
    return { code: "Error", message: "Could not reach the routing server" };
  }

  if (body.errors && body.errors.length > 0) {
    return {
      code: "Error",
      message: body.errors[0].message || "Routing server error",
    };
  }

  const plan = body.data?.planConnection;
  if (!plan) {
    return { code: "Error", message: "Unexpected routing server response" };
  }

  const edges = (plan.edges || []).filter((edge) => edge && edge.node);
  if (edges.length === 0) {
    if (plan.routingErrors && plan.routingErrors.length > 0) {
      return routingErrorResponse(plan.routingErrors);
    }
    return { code: "NoRoute", message: "No Route" };
  }

  const node = edges[0].node;
  const legs: Leg[] = (node.legs || []).filter(Boolean).map(toLeg);

  const routeResult: RouteResult = {
    origin: point(origin.lon, origin.lat),
    destination: point(destination.lon, destination.lat),
    itinerary: {
      startTime: node.start ?? legs[0]?.startTime ?? null,
      endTime: node.end ?? legs[legs.length - 1]?.endTime ?? null,
      duration: node.duration ?? 0,
      walkDistance:
        node.walkDistance ??
        legs
          .filter((leg) => leg.type === "walk")
          .reduce((sum, leg) => sum + leg.distance, 0),
      distance: legs.reduce((sum, leg) => sum + leg.distance, 0),
      transfers: node.numberOfTransfers ?? 0,
      hasTransit: legs.some((leg) => leg.type === "transit"),
      legs,
    },
  };

  return { code: "Ok", routeResult };
};

export default fetchDirections;
