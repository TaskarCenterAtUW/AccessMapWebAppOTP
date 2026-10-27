import React from "react";

import Button from "react-md/src/js/Buttons";
import { CardText } from "react-md/src/js/Cards";
import Toolbar from "react-md/src/js/Toolbars";

import Step, { StepMode } from "./Step";

import { PedestrianSegment, RouteResult, TransitLeg, WalkLeg } from "types";
import { formatTime } from "utils/trip-time";

interface Props {
  onClose?(event: React.MouseEvent<HTMLElement, MouseEvent>): void;
  routeResult?: RouteResult;
}

type Coordinates = number[][];

interface StepData {
  // Without the turn that leads into it, e.g. "use the sidewalk"
  action: string;
  subtitle?: string;
  distance?: number;
  surface?: string;
  incline?: number;
  details?: string[];
  mode?: StepMode;
  // The path of a walking step, to work out the turn into the next one
  coordinates?: Coordinates;
  // A pathway inside a station, its GTFS pathway_mode, and the level a
  // walkway is on
  indoor?: boolean;
  pathwayMode?: string;
  level?: string;
  // A message such as "You are entering the station", which is not a turn
  message?: boolean;
}

// Plain footways shorter than this, which join sidewalks to crossings, are
// walked as part of the step that follows them.
const LINK_MAX_LENGTH = 10;

// How far back and ahead of a turn to look for the direction of travel, so
// that a kink at the very end of a path does not count as a turn.
const TURN_LOOK_METERS = 6;

const COMPASS = [
  "north",
  "northeast",
  "east",
  "southeast",
  "south",
  "southwest",
  "west",
  "northwest",
];

const PATHWAY_ACTIONS = {
  WALKWAY: "use the walkway",
  STAIRS: "use the stairs",
  MOVING_SIDEWALK: "use the moving sidewalk/travelator",
  ESCALATOR: "use the escalator",
  ELEVATOR: "use the elevator",
  FARE_GATE: "use the fare gate",
  EXIT_GATE: "use the exit gate",
};

const RAIL_MODES = [
  "RAIL",
  "TRAM",
  "SUBWAY",
  "MONORAIL",
  "FUNICULAR",
  "CABLE_CAR",
];

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

const metersBetween = (a: number[], b: number[]): number => {
  const dLat = toRadians(b[1] - a[1]);
  const dLon = toRadians(b[0] - a[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a[1])) *
      Math.cos(toRadians(b[1])) *
      Math.sin(dLon / 2) ** 2;
  return 6371008.8 * 2 * Math.asin(Math.sqrt(h));
};

// Compass bearing from one coordinate to another, in degrees from north.
const bearing = (a: number[], b: number[]): number => {
  const lat1 = toRadians(a[1]);
  const lat2 = toRadians(b[1]);
  const dLon = toRadians(b[0] - a[0]);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (Math.atan2(y, x) * 180) / Math.PI;
};

// The bearing of the last few meters of a path.
const endBearing = (coordinates: Coordinates): number => {
  const end = coordinates[coordinates.length - 1];
  let i = coordinates.length - 2;
  while (i > 0 && metersBetween(coordinates[i], end) < TURN_LOOK_METERS) {
    i -= 1;
  }
  return bearing(coordinates[Math.max(i, 0)], end);
};

// The bearing of the first few meters of a path.
const startBearing = (coordinates: Coordinates): number => {
  const start = coordinates[0];
  let i = 1;
  while (
    i < coordinates.length - 1 &&
    metersBetween(start, coordinates[i]) < TURN_LOOK_METERS
  ) {
    i += 1;
  }
  return bearing(start, coordinates[Math.min(i, coordinates.length - 1)]);
};

// The turn from one walking step into the next, e.g. "Turn left and ".
const turn = (from: Coordinates, to: Coordinates): string => {
  const angle =
    ((((endBearing(from) - startBearing(to)) % 360) + 540) % 360) - 180;
  if (angle >= 67.5 && angle <= 112.5) return "Turn left and ";
  if (angle <= -67.5 && angle >= -112.5) return "Turn right and ";
  if (angle >= -22.5 && angle <= 22.5) return "Continue straight and ";
  if (angle > 22.5 && angle < 67.5) return "Slight left and ";
  if (angle < -22.5 && angle > -67.5) return "Slight right and ";
  if (angle > 112.5) return "Sharp left and ";
  if (angle < -112.5) return "Sharp right and ";
  return "";
};

const capitalize = (text: string): string =>
  text.charAt(0).toUpperCase() + text.slice(1);

const segmentStep = (s: PedestrianSegment): StepData => {
  const step: StepData = {
    action: "use the footway",
    subtitle: s.description || "",
    distance: s.distance || 0,
    surface: s.surface,
    incline: s.incline,
    mode: "pedestrian",
    coordinates: s.geometry.coordinates,
  };

  switch (s.highway) {
    case "footway":
      if (s.footway === "sidewalk") {
        step.action = "use the sidewalk";
      } else if (s.footway === "crossing") {
        step.action = "cross the street";
      } else if (s.footway === "traffic_island") {
        step.action = "use the traffic island";
      } else if (s.elevator) {
        step.action = `use ${s.indoor ? "indoor" : "outdoor"} elevator`;
      } else if (s.indoor) {
        step.action = "use the indoor path";
      }
      break;
    case "steps":
      step.action = "use the stairs";
      break;
    case "elevator":
      step.action = `use ${s.indoor ? "indoor" : "outdoor"} elevator`;
      break;
    case "cycleway":
    case "living_street":
    case "pedestrian":
      step.action = {
        cycleway: "use the cycleway",
        living_street: "use the living street",
        pedestrian: "use the pedestrian path",
      }[s.highway];
      step.subtitle = s.name || "";
      break;
    default:
      if (s.highway) {
        step.action = `use the ${s.highway} road`;
        step.subtitle = s.name || "";
        step.mode = "road";
      }
  }
  return step;
};

// Where a pathway takes the traveller between levels, e.g. "Up from Mezzanine
// to Platform", or null if it stays on one level or the levels are unknown.
const levelChangeText = (s: PedestrianSegment): string => {
  if (!s.toLevel || s.fromLevel === s.toLevel) return null;
  const direction =
    s.levelChange > 0 ? "Up" : s.levelChange < 0 ? "Down" : null;
  if (s.pathwayMode === "ELEVATOR" || !s.fromLevel) {
    return direction ? `${direction} to ${s.toLevel}` : `To ${s.toLevel}`;
  }
  return direction
    ? `${direction} from ${s.fromLevel} to ${s.toLevel}`
    : `From ${s.fromLevel} to ${s.toLevel}`;
};

const pathwayStep = (s: PedestrianSegment): StepData => {
  const sign = s.name || s.description || "";
  const levelChange = levelChangeText(s);
  const level =
    !levelChange && (s.toLevel || s.fromLevel)
      ? s.toLevel || s.fromLevel
      : undefined;
  return {
    action: PATHWAY_ACTIONS[s.pathwayMode] || "use the walkway",
    // Signs are on walkways; stairs, escalators and elevators say where they go
    subtitle: levelChange
      ? [levelChange, sign].filter(Boolean).join(" · ")
      : sign,
    // The length of an elevator ride means nothing to the traveller
    distance: s.pathwayMode === "ELEVATOR" ? null : s.distance || 0,
    details: level ? [`Level: ${level}`] : [],
    mode: "pedestrian",
    indoor: true,
    pathwayMode: s.pathwayMode,
    level,
  };
};

const isLink = (s: PedestrianSegment): boolean =>
  s.highway === "footway" &&
  !s.footway &&
  !s.elevator &&
  (s.distance || 0) < LINK_MAX_LENGTH;

const walkLegSteps = (leg: WalkLeg): StepData[] => {
  if (leg.segments.length === 0) {
    return [
      {
        action: `walk to ${leg.to.name || "your destination"}`,
        distance: leg.distance,
        mode: "pedestrian",
        coordinates: leg.geometry.coordinates,
      },
    ];
  }

  const steps: StepData[] = [];
  // Short links waiting to be added to the step that follows them
  let links: PedestrianSegment[] = [];

  leg.segments.forEach((s, i) => {
    const last = steps[steps.length - 1];
    const isLastSegment = i === leg.segments.length - 1;

    if (s.pathwayMode) {
      // Links before the station belong to the step before it
      if (last && links.length > 0) {
        links.forEach((link) => {
          last.distance += link.distance || 0;
        });
        links = [];
      }
      const next = pathwayStep(s);
      if (
        last &&
        last.pathwayMode === "WALKWAY" &&
        next.pathwayMode === "WALKWAY" &&
        last.level === next.level
      ) {
        // Walkways are mapped as many short pieces between points in the
        // station; walking them is one step
        last.distance += s.distance || 0;
        last.subtitle = last.subtitle || next.subtitle;
        return;
      }
      steps.push(next);
      return;
    }

    if (isLink(s) && !isLastSegment) {
      links.push(s);
      return;
    }

    if (
      last &&
      links.length === 0 &&
      s.highway === "footway" &&
      s.footway === "crossing" &&
      last.action === "cross the street" &&
      last.subtitle === (s.description || "")
    ) {
      // One crossing, mapped as several edges
      last.distance += s.distance || 0;
      last.coordinates = last.coordinates.concat(s.geometry.coordinates);
      return;
    }

    const step = segmentStep(s);
    links.forEach((link) => {
      step.distance += link.distance || 0;
    });
    step.coordinates = links
      .reduce(
        (acc, link) => acc.concat(link.geometry.coordinates),
        [] as Coordinates
      )
      .concat(step.coordinates);
    links = [];
    steps.push(step);
  });

  return steps;
};

const stopName = (place: TransitLeg["from"]): string =>
  (place.stop && place.stop.name) || place.name || "the stop";

const transitLegStep = (leg: TransitLeg): StepData => {
  const route = leg.route;
  const routeName = route && (route.shortName || route.longName);
  const toward = leg.headsign ? ` toward ${leg.headsign}` : "";
  const stops = leg.intermediateStopCount + 1;
  const details = [
    `Get off at ${stopName(leg.to)} after ${stops} stop${
      stops === 1 ? "" : "s"
    }`,
    `${formatTime(leg.startTime)} – ${formatTime(leg.endTime)}`,
  ];

  if (leg.mode === "BUS") {
    return {
      action: routeName
        ? `board the bus (${routeName}${toward})`
        : "board the bus",
      subtitle: `Bus stop: ${stopName(leg.from)}`,
      details,
      mode: "bus",
    };
  }
  if (RAIL_MODES.includes(leg.mode)) {
    return {
      action: "board and use the railway",
      subtitle: [
        routeName && `${routeName}${toward}`,
        `Station: ${stopName(leg.from)}`,
      ]
        .filter(Boolean)
        .join(" · "),
      details,
      mode: "railway",
    };
  }
  return {
    action: `board the ${leg.mode.toLowerCase().replace(/_/g, " ")}${
      routeName ? ` (${routeName}${toward})` : ""
    }`,
    subtitle: `Stop: ${stopName(leg.from)}`,
    details,
    mode: "bus",
  };
};

const Steps = ({ onClose = null, routeResult = null }: Props) => {
  const origin = routeResult.origin.geometry.coordinates;
  const destination = routeResult.destination.geometry.coordinates;

  const tripSteps = routeResult.itinerary.legs.reduce(
    (acc, leg) =>
      acc.concat(
        leg.type === "walk" ? walkLegSteps(leg) : [transitLegStep(leg)]
      ),
    [] as StepData[]
  );

  // Walking into and out of a station, but not off or onto a train or bus,
  // since those are inside it.
  const legSteps: StepData[] = [];
  tripSteps.forEach((step, i) => {
    const previous = tripSteps[i - 1];
    const isTransit = (other: StepData) => !other.coordinates && !other.indoor;
    if (step.indoor && previous && !previous.indoor && !isTransit(previous)) {
      legSteps.push({ action: "you are entering the station", message: true });
    }
    if (!step.indoor && previous && previous.indoor && !isTransit(step)) {
      legSteps.push({ action: "you are exiting the station", message: true });
    }
    legSteps.push(step);
  });

  // Turns between walking steps outdoors. There is no turn onto a bus or a
  // train, nor off one.
  const titles = legSteps.map((step, i) => {
    const previous = legSteps[i - 1];
    const prefix =
      previous &&
      !previous.indoor &&
      !step.indoor &&
      previous.coordinates &&
      previous.coordinates.length > 1 &&
      step.coordinates &&
      step.coordinates.length > 1
        ? turn(previous.coordinates, step.coordinates)
        : "";
    return capitalize(prefix + step.action);
  });

  const first = legSteps.find(
    (step) => step.coordinates && step.coordinates.length > 1
  );
  const heading = first
    ? COMPASS[
        Math.round(((startBearing(first.coordinates) + 360) % 360) / 45) % 8
      ]
    : null;

  const steps = [
    heading && (
      <Step
        key="step-origin"
        title={`Start by heading ${heading}`}
        mode="pedestrian"
      />
    ),
    ...legSteps.map((d, i) => (
      <Step
        key={`step-${origin}-${destination}-${i}`}
        title={titles[i]}
        subtitle={d.subtitle}
        distance={d.distance}
        surface={d.surface}
        incline={d.incline}
        details={d.details}
        mode={d.mode}
        indoor={d.indoor}
      />
    )),
    <Step key="step-destination" title="You have reached your destination" />,
  ];

  return (
    <>
      <Toolbar
        title="Directions:"
        actions={[
          <Button key="steps-close-button" icon onClick={onClose}>
            close
          </Button>,
        ]}
      />
      <CardText className="steps">{steps}</CardText>
    </>
  );
};

export default Steps;
