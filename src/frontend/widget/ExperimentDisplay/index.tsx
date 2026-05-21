import {
  Box,
  Button,
  ErrorMessage,
  Inline,
  Lozenge,
  Stack,
  Text,
  Tooltip,
} from "@forge/react";
import React from "react";
import type { Experiment, ExperimentResponse, Feature } from "src/utils/types";
import GrowthBookLink from "../GrowthBookLink";
import { formatDate, getWinningVariant } from "../../../utils";
import useApi from "../../hooks/useApi";
import LoadingSpinner from "../LoadingSpinner";
import MissingObject from "../MissingObject";
import ExperimentStatusLozenge from "./ExperimentStatusLozenge";
import AssociatedFeature from "./AssociatedFeature";

export function ExperimentDates({ experiment }: { experiment: Experiment }) {
  const lastPhase = experiment.phases[experiment.phases.length - 1];
  if (experiment.status === "draft")
    return (
      <Stack>
        <Inline>
          <Text>Last updated {formatDate(experiment.dateUpdated)}</Text>
        </Inline>
      </Stack>
    );
  if (experiment.status === "running")
    return (
      <Stack>
        <Inline>
          <Text>Phase started {formatDate(lastPhase.dateStarted)}</Text>
        </Inline>
      </Stack>
    );
  if (experiment.status === "stopped")
    return (
      <Stack>
        <Inline>
          <Text>Phase started {formatDate(lastPhase.dateStarted)}</Text>
        </Inline>
        <Inline>
          <Text>Phase ended {formatDate(lastPhase.dateEnded)}</Text>
        </Inline>
      </Stack>
    );
  return <></>;
}

export default function ExperimentDisplay({
  experimentId,
  onRemove,
}: {
  experimentId: string;
  onRemove?: () => void;
}) {
  const {
    isLoading: experimentApiLoading,
    error: experimentApiError,
    data: experimentData,
  } = useApi<ExperimentResponse>(
    `/api/v1/experiments/${experimentId}?withRevisions=drafts`
  );
  const experiment = experimentData?.experiment;

  let associatedFeature: string | undefined;
  if (experiment) {
    associatedFeature = experiment?.linkedFeatures?.[0];
  }
  const {
    data: featureData,
    isLoading: featureApiLoading,
    error: featureApiError,
  } = useApi<{ feature: Feature }>(
    associatedFeature
      ? `/api/v1/features/${associatedFeature}?withRevisions=drafts`
      : null
  );

  if (experimentApiLoading)
    return <LoadingSpinner text="Fetching your experiment..." />;
  if (experimentApiError)
    return <ErrorMessage>{experimentApiError.message}</ErrorMessage>;
  if (!experiment)
    return <MissingObject objectType="experiment" onRemove={onRemove} />;
  if (featureApiLoading) {
    return <LoadingSpinner text="Loading associated feature status..." />;
  }
  if (featureApiError) {
    return <ErrorMessage>{featureApiError.message}</ErrorMessage>;
  }

  const expType = experiment.hasURLRedirects
    ? "URL Redirect"
    : experiment.hasVisualChangesets
    ? "Visual Editor"
    : associatedFeature
    ? "Feature Flag"
    : "Awaiting Implementation";

  const winningVariant = getWinningVariant(experiment);

  return (
    <Stack alignBlock="start" alignInline="start" space="space.050">
      <Inline grow="fill" alignBlock="start" spread="space-between">
        <Inline
          shouldWrap
          alignBlock="center"
          space="space.150"
          rowSpace="space.0"
        >
          <Tooltip content="View experiment in GrowthBook">
            <GrowthBookLink path={`/experiment/${experiment.id}`}>
              <Text weight="medium" size="large">
                {experiment.name}
              </Text>
            </GrowthBookLink>
          </Tooltip>
          <ExperimentStatusLozenge
            experiment={experiment}
            tooltipContent={
              winningVariant ? `Winning variant: ${winningVariant}` : ""
            }
          />
        </Inline>

        {onRemove && (
          <Button
            appearance="subtle"
            onClick={onRemove}
            spacing="compact"
          >
            <Text
              weight="medium"
              color="color.link"
              size="small"
              align="center"
            >
              Unlink
            </Text>
          </Button>
        )}
      </Inline>
      <ExperimentDates experiment={experiment} />
      <Inline grow="fill" space="space.050" alignBlock="center">
        Type: <Text weight="medium">{expType}</Text>
      </Inline>
      {featureData?.feature && (
        <Box paddingBlockStart="space.100">
          <AssociatedFeature feature={featureData.feature} />
        </Box>
      )}
    </Stack>
  );
}
