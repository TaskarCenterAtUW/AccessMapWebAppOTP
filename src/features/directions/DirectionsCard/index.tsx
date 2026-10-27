import React from "react";

import Button from "react-md/src/js/Buttons";
import Card, { CardActions, CardText } from "react-md/src/js/Cards";
import Toolbar from "react-md/src/js/Toolbars";

import { useAppSelector, useAppDispatch } from "hooks";
import {
  clickStepsButton,
  clickDirectionsInfoButton,
} from "features/directions/directions-slice";

import formatDistance from "utils/format-distance";
import { formatDuration, formatTime } from "utils/trip-time";
import {
  OMNICARD_DESKTOP_WIDTH,
  OMNICARD_MOBILE_LANDSCAPE_WIDTH,
} from "constants/omnicard";

const DirectionsCard = () => {
  const dispatch = useAppDispatch();
  const currentActivity = useAppSelector(
    (state) => state.activities.currentActivity
  );
  const { hasRoute, routeResult } = useAppSelector((state) => state.directions);
  const { mediaType, orientation } = useAppSelector((state) => state.browser);

  if (!hasRoute) return null;
  if (currentActivity === "directions-info") return null;
  if (currentActivity === "directions-steps") return null;

  const { itinerary } = routeResult;

  const distanceText = formatDistance(itinerary.walkDistance);

  const { transfers } = itinerary;
  const timesText = `${formatTime(itinerary.startTime)} – ${formatTime(
    itinerary.endTime
  )} · ${
    transfers === 0
      ? "No transfers"
      : `${transfers} transfer${transfers === 1 ? "" : "s"}`
  }`;

  let style;
  if (mediaType === "mobile") {
    if (orientation === "portrait") {
      style = {
        left: 0,
      };
    } else {
      style = {
        left: 0,
        width: `${OMNICARD_MOBILE_LANDSCAPE_WIDTH}px`,
      };
    }
  } else {
    style = {
      left: `${OMNICARD_DESKTOP_WIDTH + 8}px`,
    };
  }

  return (
    <Card className="directions-card" style={style}>
      <Toolbar title="Route">
        <CardText>
          {itinerary.hasTransit ? `${distanceText} walking` : distanceText}
        </CardText>
        <CardText>{formatDuration(itinerary.duration)}</CardText>
      </Toolbar>
      {itinerary.hasTransit && <CardText>{timesText}</CardText>}
      <CardActions>
        <Button
          className="directions-card--button"
          raised
          primary
          iconBefore
          iconChildren="directions"
          onClick={() => dispatch(clickStepsButton())}
        >
          Directions
        </Button>
        <Button
          className="directions-card--button"
          raised
          primary
          iconBefore
          iconChildren="info"
          onClick={() => dispatch(clickDirectionsInfoButton())}
        >
          Info
        </Button>
      </CardActions>
    </Card>
  );
};

export default DirectionsCard;
