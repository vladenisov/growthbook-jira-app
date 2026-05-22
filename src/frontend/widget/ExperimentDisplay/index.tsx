import {
  Box,
  Button,
  ErrorMessage,
  Heading,
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

function pct(weight: number): string {
  if (!Number.isFinite(weight)) return "0%";
  const rounded = Math.round(weight * 1000) / 10;
  return `${rounded}%`;
}

const dateOnlyFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function fmtDate(ts?: string) {
  if (!ts) return "";
  return dateOnlyFormatter.format(new Date(ts));
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <Text size="small">
      <Text as="span" color="color.text.subtle">
        {label}:
      </Text>{" "}
      <Text as="span" weight="medium">
        {value}
      </Text>
    </Text>
  );
}

export function ExperimentDates({ experiment }: { experiment: Experiment }) {
  const lastPhase = experiment.phases[experiment.phases.length - 1];
  if (experiment.status === "draft")
    return (
      <MetaItem
        label="Last updated"
        value={formatDate(experiment.dateUpdated)}
      />
    );
  if (!lastPhase) return <></>;
  if (experiment.status === "running")
    return (
      <Stack space="space.025">
        <MetaItem
          label="Phase started"
          value={fmtDate(lastPhase.dateStarted)}
        />
        <MetaItem label="Coverage" value={pct(lastPhase.coverage)} />
      </Stack>
    );
  if (experiment.status === "stopped")
    return (
      <Stack space="space.025">
        <MetaItem
          label="Phase"
          value={`${fmtDate(lastPhase.dateStarted)} → ${fmtDate(
            lastPhase.dateEnded
          )}`}
        />
        {lastPhase.reasonForStopping && (
          <Text size="small" color="color.text.subtle">
            Reason: {lastPhase.reasonForStopping}
          </Text>
        )}
      </Stack>
    );
  return <></>;
}

function VariationsList({ experiment }: { experiment: Experiment }) {
  const lastPhase = experiment.phases[experiment.phases.length - 1];
  const winnerId = experiment.resultSummary?.releasedVariationId;
  const weights = new Map<string, number>();
  if (lastPhase?.trafficSplit) {
    for (const t of lastPhase.trafficSplit) weights.set(t.variationId, t.weight);
  }
  return (
    <Stack space="space.050">
      <Heading as="h6">Variations ({experiment.variations.length})</Heading>
      <Stack space="space.025">
        {experiment.variations.map((v) => {
          const weight = weights.get(v.variationId);
          const isWinner = winnerId && winnerId === v.variationId;
          const name = v.name || v.key;
          return (
            <Inline
              key={v.variationId}
              space="space.100"
              alignBlock="center"
              shouldWrap
              rowSpace="space.0"
            >
              <Text>
                <Text as="span" weight="medium">
                  {name}
                </Text>
                {typeof weight === "number" && (
                  <Text as="span" color="color.text.subtle">
                    {"  ·  "}
                    {pct(weight)}
                  </Text>
                )}
              </Text>
              {isWinner && <Lozenge appearance="success">Winner</Lozenge>}
            </Inline>
          );
        })}
      </Stack>
    </Stack>
  );
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
    <Stack alignBlock="start" alignInline="start" space="space.100">
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
          <Button appearance="subtle" onClick={onRemove} spacing="compact">
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

      <Inline space="space.100" alignBlock="center" shouldWrap rowSpace="space.025">
        <Text size="small" color="color.text.subtle">
          {[
            expType,
            experiment.type === "multi-armed-bandit" ? "Bandit" : null,
            experiment.hashAttribute
              ? `Hashed on ${experiment.hashAttribute}`
              : null,
          ]
            .filter(Boolean)
            .join("  ·  ")}
        </Text>
      </Inline>

      {(experiment.hasVisualChangesets || experiment.hasURLRedirects) && (
        <Inline space="space.050" shouldWrap rowSpace="space.025">
          {experiment.hasVisualChangesets && <Lozenge>Visual Editor</Lozenge>}
          {experiment.hasURLRedirects && <Lozenge>URL Redirect</Lozenge>}
        </Inline>
      )}

      {experiment.variations.length > 0 && (
        <VariationsList experiment={experiment} />
      )}

      <ExperimentDates experiment={experiment} />

      {featureData?.feature && (
        <Box paddingBlockStart="space.100">
          <AssociatedFeature feature={featureData.feature} />
        </Box>
      )}
    </Stack>
  );
}
