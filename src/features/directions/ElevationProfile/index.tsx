import React from "react";

import SVGIcon from "react-md/src/js/SVGIcons";

import { PedestrianSegment } from "types";

interface Props {
  // Walked OpenSidewalks segments, in travel order
  segments: PedestrianSegment[];
}

const ElevationProfile = ({ segments }: Props) => {
  const w = 100;
  const h = 50;
  const insetBy = 4;
  const marginRight = 24;
  const marginBottom = 6;

  const data = [[0, 0]];
  let totalLength = 0;
  let totalHeight = 0;
  let maxHeight = 0;
  let minHeight = 0;
  segments.forEach((segment) => {
    const length = segment.distance || 0;
    const incline = segment.incline || 0;
    totalLength += length;
    totalHeight += length * incline;

    maxHeight = Math.max(maxHeight, totalHeight);
    minHeight = Math.min(minHeight, totalHeight);

    data.push([totalLength, totalHeight]);
  });

  // Nothing to plot without walked distance
  if (totalLength <= 0) return null;
  const heightRange = maxHeight - minHeight;

  const xMin = insetBy;
  const xMax = w - insetBy - marginRight;
  const dx = xMax - xMin;

  const yMin = insetBy;
  const yMax = h - insetBy - marginBottom;
  const dy = yMax - yMin;

  const normalized = data.map((d) => [
    dx * (d[0] / totalLength),
    heightRange > 0 ? dy * ((d[1] - minHeight) / heightRange) : 0,
  ]);

  // TODO: don't use SVGIcon? Plain SVG would be appropriate.
  return (
    <SVGIcon viewBox={`0 0 ${w} ${h}`} className="elevation-profile">
      <path
        d={normalized
          .map(
            (d, i) =>
              `${i === 0 ? "M" : "L"}${d[0] + insetBy} ${
                h - marginBottom - d[1] - insetBy
              }`
          )
          .join(" ")}
      />
      <text x={w - marginRight} y={6} fontSize={6}>
        {maxHeight.toFixed(1)}
      </text>
      <text x={w - marginRight} y={h - marginBottom} fontSize={6}>
        {minHeight.toFixed(1)}
      </text>
      <text
        x={w - 8}
        y={Math.floor((h - marginBottom) / 2)}
        fontSize={6}
        textAnchor="middle"
        transform={`rotate(270,${w - 8}, ${Math.floor(
          (h - marginBottom) / 2
        )})`}
      >
        {"Height (meters)"}
      </text>
      <text x={0} y={h} fontSize={6}>
        {0}
      </text>
      <text x={w - marginRight - 8} y={h} fontSize={6}>
        {Math.round(totalLength)}
      </text>
      <text
        x={Math.floor((w - marginRight) / 2)}
        y={h}
        fontSize={6}
        textAnchor="middle"
      >
        {"Distance (meters)"}
      </text>
    </SVGIcon>
  );
};

export default ElevationProfile;
