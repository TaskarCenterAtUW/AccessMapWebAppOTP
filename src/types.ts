import { Feature, Point, LineString } from "geojson";

export type Activity =
  | "default"
  | "planning-trip"
  | "directions"
  | "directions-info"
  | "directions-steps"
  | "setting-profile"
  | "viewing-map-info"
  | "signing-up";
export type Media = "mobile" | "tablet" | "desktop";
export type Orientation = "portrait" | "landscape";

export interface TransportationProperties {
  construction: boolean;
  cost: number;
  crossing: string;
  curbramps: boolean;
  description: string;
  elevator: boolean;
  footway: "sidewalk" | "crossing";
  grade: number;
  incline: number;
  indoor: boolean;
  length: number;
  opening_hours: string;
  subclass: "footway";
  surface: string;
}

// A single OpenSidewalks edge walked as part of a walk leg, in travel order.
// Every field other than geometry may be null.
export interface PedestrianSegment {
  geometry: LineString;
  // Meters actually walked on this edge
  distance: number | null;
  highway: string | null;
  footway: string | null;
  name: string | null;
  description: string | null;
  // Grade in the direction of travel
  incline: number | null;
  curbRamps: boolean | null;
  elevator: boolean | null;
  indoor: boolean | null;
  surface: string | null;
  // The GTFS pathway_mode of a station pathway, e.g. ESCALATOR; null for
  // sidewalks, crossings and other OpenSidewalks edges
  pathwayMode: string | null;
  // The station levels a pathway starts and ends on, e.g. "Mezzanine", and
  // how many levels it goes up (negative when it goes down), if known
  fromLevel: string | null;
  toLevel: string | null;
  levelChange: number | null;
}

export interface TripPlace {
  name: string | null;
  lon: number;
  lat: number;
  stop: {
    gtfsId: string;
    name: string | null;
    code: string | null;
  } | null;
}

interface BaseLeg {
  // OTP mode, e.g. WALK, BUS, RAIL
  mode: string;
  // ISO 8601 timestamps with the offset of the trip's local time
  startTime: string;
  endTime: string;
  // Seconds
  duration: number;
  // Meters
  distance: number;
  from: TripPlace;
  to: TripPlace;
  geometry: LineString;
}

export interface WalkLeg extends BaseLeg {
  type: "walk";
  segments: PedestrianSegment[];
}

export interface TransitLeg extends BaseLeg {
  type: "transit";
  headsign: string | null;
  route: {
    shortName: string | null;
    longName: string | null;
    // CSS hex colors including the leading '#', or null
    color: string | null;
    textColor: string | null;
  } | null;
  agencyName: string | null;
  // Number of stops between boarding and alighting
  intermediateStopCount: number;
}

export type Leg = WalkLeg | TransitLeg;

export interface Itinerary {
  // ISO 8601 timestamps with offset
  startTime: string;
  endTime: string;
  // Seconds
  duration: number;
  // Meters walked
  walkDistance: number;
  // Meters, all legs (walk + transit)
  distance: number;
  transfers: number;
  hasTransit: boolean;
  legs: Leg[];
}

// Route data: the best itinerary for the requested origin and destination
export interface RouteResult {
  origin: Feature<Point>;
  destination: Feature<Point>;
  itinerary: Itinerary;
}
