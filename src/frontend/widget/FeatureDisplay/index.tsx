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
import type {
  Experiment,
  Feature,
  FeatureExperimentRefRule,
  FeatureResponse,
} from "src/utils/types";
import GrowthBookLink from "../GrowthBookLink";
import { formatDate } from "../../../utils";
import useApi from "../../hooks/useApi";
import LoadingSpinner from "../LoadingSpinner";
import MissingObject from "../MissingObject";
import FeatureStatusLozenge from "./FeatureStatusLozenge";
import AssociatedExperiment from "./AssociatedExperiment";
import { useAppSettingsContext } from "../../hooks/useAppSettingsContext";

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

function pluralizeRules(count: number) {
  return `${count} active ${count === 1 ? "rule" : "rules"}`;
}

function getPublishedRuleCount(featureEnv: Feature["environments"][string]) {
  if (featureEnv.definition) {
    try {
      const definition = JSON.parse(featureEnv.definition) as {
        rules?: unknown[];
      };
      if (Array.isArray(definition.rules)) return definition.rules.length;
    } catch {
      // Fall back to the source rules below if GrowthBook returns invalid JSON.
    }
  }
  return featureEnv.rules.filter((rule) => rule.enabled).length;
}

function getPrimaryFeatureEnvironment(
  feature: Feature,
  primaryEnvironment: string
) {
  if (primaryEnvironment) {
    return {
      id: primaryEnvironment,
      environment: feature.environments[primaryEnvironment],
    };
  }

  if (feature.environments.production) {
    return {
      id: "production",
      environment: feature.environments.production,
    };
  }

  const firstEnabledEntry = Object.entries(feature.environments).find(
    ([, featureEnv]) => featureEnv.enabled
  );
  const firstEntry = firstEnabledEntry || Object.entries(feature.environments)[0];
  if (!firstEntry) return { id: "", environment: undefined };
  return { id: firstEntry[0], environment: firstEntry[1] };
}

function formatValueType(valueType: Feature["valueType"]) {
  return `${valueType.charAt(0).toUpperCase()}${valueType.slice(1)} flag`;
}

export default function FeatureDisplay({
  featureId,
  onRemove,
}: {
  featureId: string;
  onRemove?: () => void;
}) {
  const { primaryEnvironment } = useAppSettingsContext();
  const {
    isLoading: featureApiLoading,
    error: featureApiError,
    data: featureData,
  } = useApi<FeatureResponse>(
    `/api/v1/features/${featureId}?withRevisions=drafts`
  );

  const feature = featureData?.feature;

  let associatedExperiment: string | undefined;
  if (feature) {
    // Find the first experiment rule across all environments
    const expRule = Object.values(feature.environments)
      .map((featureEnv) =>
        featureEnv.rules.find((rule) => rule.type === "experiment-ref")
      )
      .find((ruleOrUndef) => ruleOrUndef);
    // Forge linting fails to infer this typing automatically. No actual casting is happening here
    associatedExperiment = (expRule as FeatureExperimentRefRule | undefined)
      ?.experimentId;
  }

  const {
    data: experimentData,
    isLoading: experimentApiLoading,
    error: experimentApiError,
  } = useApi<{ experiment: Experiment }>(
    associatedExperiment ? `/api/v1/experiments/${associatedExperiment}` : null
  );

  if (featureApiLoading)
    return <LoadingSpinner text="Fetching your feature..." />;
  if (featureApiError)
    return <ErrorMessage>{featureApiError.message}</ErrorMessage>;
  if (!feature)
    return <MissingObject objectType="feature" onRemove={onRemove} />;
  if (experimentApiLoading) {
    return <LoadingSpinner text="Loading associated experiment status..." />;
  }
  if (experimentApiError) {
    return <ErrorMessage>{experimentApiError.message}</ErrorMessage>;
  }

  const draft = (feature.revisions || []).find((rev) => rev.status === "draft");
  const primaryFeatureEnvironment = getPrimaryFeatureEnvironment(
    feature,
    primaryEnvironment
  );
  const activeRuleCount = primaryFeatureEnvironment.environment?.enabled
    ? getPublishedRuleCount(primaryFeatureEnvironment.environment)
    : 0;
  const featureTags = feature.tags || [];

  return (
    <Stack alignBlock="start" alignInline="start" space="space.100">
      <Inline grow="fill" alignBlock="start" spread="space-between">
        <Inline
          shouldWrap
          alignBlock="center"
          space="space.150"
          rowSpace="space.0"
        >
          <Tooltip content="View feature in GrowthBook">
            <GrowthBookLink path={`/features/${feature.id}`}>
              <Text weight="medium" size="large">
                {feature.id}
              </Text>
            </GrowthBookLink>
          </Tooltip>
          <FeatureStatusLozenge
            tooltipContent={
              draft ? `Draft Created ${formatDate(draft.date)}` : ""
            }
            feature={feature}
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

      <Inline
        space="space.100"
        alignBlock="center"
        shouldWrap
        rowSpace="space.025"
      >
        <Text size="small" color="color.text.subtle">
          {[
            formatValueType(feature.valueType),
            primaryFeatureEnvironment.id
              ? `${primaryFeatureEnvironment.id} environment`
              : null,
            pluralizeRules(activeRuleCount),
          ]
            .filter(Boolean)
            .join("  ·  ")}
        </Text>
      </Inline>

      {featureTags.length > 0 && (
        <Inline space="space.050" shouldWrap rowSpace="space.025">
          {featureTags.map((tag) => (
            <Lozenge key={tag}>{tag}</Lozenge>
          ))}
        </Inline>
      )}

      <Stack space="space.025">
        <MetaItem label="Revision" value={`#${feature.revision.version}`} />
        <MetaItem
          label="Last published"
          value={`${formatDate(feature.revision.date)} by ${
            feature.revision.publishedBy
          }`}
        />
      </Stack>

      {/* <GrowthBookLink path={`/features/${feature.id}#test`} hideIcon>
        <Text size="small" weight="medium">
          Preview as Archetype
        </Text>
      </GrowthBookLink> */}
      {experimentData?.experiment && (
        <Box paddingBlockStart="space.100">
          <AssociatedExperiment experiment={experimentData.experiment} />
        </Box>
      )}
    </Stack>
  );
}
