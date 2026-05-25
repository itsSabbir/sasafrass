import { memo } from "react";
import { LANE_HEIGHT } from "../../app/constants";
import type { EnvironmentLane } from "../../types";

interface CanvasLaneProps {
  environment: EnvironmentLane;
  index: number;
}

export const CanvasLane = memo(function CanvasLane({ environment, index }: CanvasLaneProps) {
  return (
    <div className="environment-lane" style={{ top: index * LANE_HEIGHT, height: LANE_HEIGHT }}>
      <div className="lane-label" style={{ borderColor: environment.color }}>
        <span style={{ background: environment.color }} />
        {environment.name}
      </div>
    </div>
  );
});
