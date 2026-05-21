import React from "react";
import { LinkedObject } from "src/utils/types";
import ExperimentDisplay from "./ExperimentDisplay";
import FeatureDisplay from "./FeatureDisplay";
import MissingObject from "./MissingObject";

export default function LinkedObjectInfo({
  linkedObject,
  onRemove,
}: {
  linkedObject: LinkedObject;
  onRemove?: () => void;
}) {
  const { type, id } = linkedObject;

  if (type === "feature") {
    return <FeatureDisplay featureId={id} onRemove={onRemove} />;
  }

  if (type === "experiment") {
    return <ExperimentDisplay experimentId={id} onRemove={onRemove} />;
  }

  return <MissingObject objectType={type} onRemove={onRemove} />;
}
