import React from "react";

import Button from "react-md/src/js/Buttons";
import { CardText } from "react-md/src/js/Cards";
import List, { ListItem } from "react-md/src/js/Lists";
import Toolbar from "react-md/src/js/Toolbars";

import ElevationProfile from "../ElevationProfile";

import { PedestrianSegment, RouteResult, WalkLeg } from "types";
import formatDistance from "utils/format-distance";
import { formatDuration, formatTime } from "utils/trip-time";

interface Props {
  onClose?(event: React.MouseEvent): void;
  routeResult?: RouteResult;
}

// Shorter segments, such as the ends of curb ramps, don't count towards the
// steepest incline of a trip, and nor do stairs.
const MIN_INCLINE_LENGTH = 3;

const percent = (grade: number): string =>
  `${Math.round(Math.abs(grade) * 1000) / 10} %`;

const DirectionsInfo = ({ onClose, routeResult }: Props) => {
  const { itinerary } = routeResult;

  // Elevation information comes from the walked OpenSidewalks segments only
  const segments = itinerary.legs
    .filter((leg): leg is WalkLeg => leg.type === "walk")
    .reduce((acc, leg) => acc.concat(leg.segments), [] as PedestrianSegment[]);

  let uphillMax = 0;
  let downhillMax = 0;
  segments.forEach((segment) => {
    if (
      segment.highway === "steps" ||
      (segment.distance || 0) <= MIN_INCLINE_LENGTH
    ) {
      return;
    }
    const incline = segment.incline || 0;
    uphillMax = Math.max(incline, uphillMax);
    downhillMax = Math.min(incline, downhillMax);
  });
  const hasElevation = segments.some(
    (segment) => segment.incline !== null && (segment.distance || 0) > 0
  );

  return (
    <>
      <Toolbar
        title="Trip Information"
        actions={[
          <Button key="close-trip-info-button" icon onClick={onClose}>
            close
          </Button>,
        ]}
      />
      <CardText className="directions-info--contents">
        {hasElevation && (
          <>
            <h4>Experienced elevation gain</h4>
            <ElevationProfile segments={segments} />
          </>
        )}
        <List>
          <ListItem
            primaryText={formatDistance(itinerary.walkDistance)}
            secondaryText={
              itinerary.hasTransit ? "Walking distance" : "Total distance"
            }
          />
          <ListItem
            primaryText={formatDuration(itinerary.duration)}
            secondaryText="Estimated time"
          />
          {hasElevation && (
            <ListItem
              primaryText={percent(uphillMax)}
              secondaryText="Steepest uphill incline"
            />
          )}
          {hasElevation && (
            <ListItem
              primaryText={percent(downhillMax)}
              secondaryText="Steepest downhill incline"
            />
          )}
          {itinerary.hasTransit && (
            <ListItem
              primaryText={`${formatTime(itinerary.startTime)} – ${formatTime(
                itinerary.endTime
              )}`}
              secondaryText="Departure – arrival"
            />
          )}
          {itinerary.hasTransit && (
            <ListItem
              primaryText={`${itinerary.transfers}`}
              secondaryText="Transfers"
            />
          )}
        </List>
        <div className="md-text--secondary disclaimer">
          <strong>Disclaimer:</strong> The routes provided by AccessMap are for
          informational purposes only. We do not guarantee their accuracy,
          safety, or suitability for any specific use. Users should exercise
          their own judgment and follow local laws and regulations. By using
          AccessMap, you acknowledge that we are not liable for any errors,
          damages, or incidents that may occur from following the suggested
          routes.
        </div>
      </CardText>
    </>
  );
};

export default DirectionsInfo;
