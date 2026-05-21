import React, { useState } from "react";
import LoadingSpinner from "./LoadingSpinner";
import { Box, Button, ErrorMessage, Inline, Select, Stack } from "@forge/react";
import useApi from "../hooks/useApi";
import { useIssueContext } from "../hooks/useIssueContext";
import CreateFeatureForm from "./CreateFeatureForm";

export default function UnlinkedIssue() {
  const [mode, setMode] = useState<"select" | "create">("select");

  const {
    isLoading: featuresLoading,
    error: featuresError,
    data: featureKeys,
  } = useApi<string[]>("/api/v1/feature-keys");
  const {
    isLoading: experimentsLoading,
    error: experimentsError,
    data: experimentsData,
  } = useApi<{ experiments: Array<{ id: string; name: string }> }>(
    "/api/v1/experiment-names"
  );

  const {
    setIssueData,
    loading: contextLoading,
    error: contextError,
  } = useIssueContext();

  if (contextLoading || featuresLoading || experimentsLoading)
    return (
      <LoadingSpinner
        text={
          contextLoading
            ? "Connecting to Jira..."
            : "Loading your features and experiments..."
        }
      />
    );

  if (!featureKeys || !experimentsData) {
    return (
      <ErrorMessage>
        Failed to load your features from GrowthBook. Please try again later.
      </ErrorMessage>
    );
  }
  if (featuresError)
    return <ErrorMessage>{featuresError.message}</ErrorMessage>;
  if (experimentsError)
    return <ErrorMessage>{experimentsError.message}</ErrorMessage>;

  const featOptions = featureKeys.map((key) => ({
    label: key,
    value: key,
  }));
  const expOptions = experimentsData.experiments.map((e) => ({
    label: e.name,
    value: e.id,
  }));

  const featureKeySet = new Set(featureKeys);

  if (mode === "create") {
    return (
      <Box>
        <CreateFeatureForm onCancel={() => setMode("select")} />
        {contextError && <ErrorMessage>{contextError}</ErrorMessage>}
      </Box>
    );
  }

  return (
    <Stack space="space.100">
      <Select
        isSearchable
        options={[
          { options: featOptions, label: "Features" },
          { options: expOptions, label: "Experiments" },
        ]}
        onChange={(selectedOption) => {
          const type = featureKeySet.has(selectedOption.value)
            ? "feature"
            : "experiment";
          setIssueData({
            linkedObject: {
              type,
              id: selectedOption.value,
              name: selectedOption.label,
            },
          });
        }}
        placeholder="Choose a feature or experiment to link to this issue"
      />
      <Inline>
        <Button appearance="default" onClick={() => setMode("create")}>
          Create new feature
        </Button>
      </Inline>
      {contextError && <ErrorMessage>{contextError}</ErrorMessage>}
    </Stack>
  );
}
