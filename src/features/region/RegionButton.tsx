import React from "react";

import Button from "react-md/src/js/Buttons";

import { useAppSelector, useAppDispatch } from "hooks";

import regions from "constants/regions";

import { startSelecting as startSelectingRegion } from "./region-slice";

const RegionButton = () => {
  const dispatch = useAppDispatch();
  const region = useAppSelector((state) => state.region);

  // With one region there is nothing to choose
  if (regions.features.length < 2) {
    return null;
  }

  return (
    <Button
      key="region-open-button"
      className="region-selection-open-button"
      style={{
        position: "fixed",
        top: 8,
        right: 64,
        zIndex: 15,
        background: "#fff",
      }}
      flat
      primary
      onClick={() => dispatch(startSelectingRegion())}
    >
      {region.name}
    </Button>
  );
};

export default RegionButton;
