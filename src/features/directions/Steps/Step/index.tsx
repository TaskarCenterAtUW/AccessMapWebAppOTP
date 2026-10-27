import React from "react";

import Card, { CardTitle, CardText } from "react-md/src/js/Cards";

import formatDistance from "utils/format-distance";

const SURFACES = {
  asphalt: "Asphalt",
  concrete: "Concrete",
  gravel: "Gravel",
  grass: "Grass",
  paved: "Paved",
  paving_stones: "Paving Stones",
  unpaved: "Unpaved",
  dirt: "Dirt",
  grass_paver: "Grass Paver",
};

// Describes a grade in the direction of travel, e.g. 0.05 is "Slight uphill".
const inclineText = (incline: number): string => {
  if (incline <= -0.075) return "Steep downhill";
  if (incline <= -0.025) return "Slight downhill";
  if (incline < 0) return "Minimal downhill";
  if (incline < 0.025) return "Minimal uphill";
  if (incline < 0.075) return "Slight uphill";
  return "Steep uphill";
};

export type StepMode = "pedestrian" | "bus" | "railway" | "road";

interface Props {
  title: string;
  subtitle?: string;
  distance?: number;
  surface?: string;
  incline?: number;
  details?: string[];
  // Colors the bar on the left of the step. Messages, such as arriving at the
  // destination, have none.
  mode?: StepMode;
  // A pathway inside a station
  indoor?: boolean;
}

const Step = ({
  title,
  subtitle = "",
  distance = null,
  surface = null,
  incline = null,
  details = [],
  mode = null,
  indoor = false,
}: Props) => {
  const className = ["step", mode && `mode-${mode}`, indoor && "step-indoor"]
    .filter(Boolean)
    .join(" ");

  return (
    <Card className={className}>
      <CardTitle title={title} subtitle={subtitle} />
      {surface && (
        <CardText className="step-surface">
          Surface: {SURFACES[surface] || surface.replace(/_/g, " ")}
        </CardText>
      )}
      {incline !== null && incline !== 0 && (
        <CardText className="step-incline">
          Incline: {inclineText(incline)}
        </CardText>
      )}
      {details.map((detail) => (
        <CardText key={detail} className="step-detail">
          {detail}
        </CardText>
      ))}
      {distance !== null && (
        <CardText>{formatDistance(distance, "imperial", 1)}</CardText>
      )}
    </Card>
  );
};

export default Step;
