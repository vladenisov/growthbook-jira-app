import React, { useState } from "react";
import {
  Box,
  Button,
  ErrorMessage,
  HelperMessage,
  Inline,
  Label,
  Select,
  Stack,
  Textfield,
} from "@forge/react";
import { apiCall } from "../hooks/useApi";
import { useAppSettingsContext } from "../hooks/useAppSettingsContext";
import { useIssueContext } from "../hooks/useIssueContext";
import { useJiraContext } from "../hooks/useJiraContext";
import { Feature } from "../../utils/types";

type ValueType = "boolean" | "string" | "number" | "json";

const VALUE_TYPE_OPTIONS: Array<{ label: string; value: ValueType }> = [
  { label: "Boolean", value: "boolean" },
  { label: "String", value: "string" },
  { label: "Number", value: "number" },
  { label: "JSON", value: "json" },
];

const DEFAULT_VALUE_BY_TYPE: Record<ValueType, string> = {
  boolean: "false",
  string: "",
  number: "0",
  json: "{}",
};

const FEATURE_KEY_PATTERN = /^[a-zA-Z0-9_.:|-]+$/;

export default function CreateFeatureForm({ onCancel }: { onCancel: () => void }) {
  const { apiKey, ownerEmail, projectMappings } = useAppSettingsContext();
  const { setIssueData } = useIssueContext();
  const {
    context: { extension },
  } = useJiraContext();
  const jiraProjectId: string | undefined = extension?.project?.id;
  const mappedGbProjectId = jiraProjectId
    ? projectMappings.find((m) => m.jiraProjectId === jiraProjectId)
        ?.gbProjectId
    : undefined;

  const [featureId, setFeatureId] = useState("");
  const [description, setDescription] = useState("");
  const [valueType, setValueType] = useState<ValueType>("boolean");
  const [defaultValue, setDefaultValue] = useState(
    DEFAULT_VALUE_BY_TYPE.boolean
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const onValueTypeChange = (option: { label: string; value: ValueType }) => {
    setValueType(option.value);
    setDefaultValue(DEFAULT_VALUE_BY_TYPE[option.value]);
  };

  const onSubmit = async () => {
    setError(undefined);
    const trimmedId = featureId.trim();
    const trimmedOwner = (ownerEmail || "").trim();
    if (!trimmedId) {
      setError("Feature key is required");
      return;
    }
    if (!FEATURE_KEY_PATTERN.test(trimmedId)) {
      setError(
        "Feature key may only contain letters, numbers, and _ . : | - characters"
      );
      return;
    }
    if (!trimmedOwner) {
      setError(
        "Set the owner email on the Configure page before creating features"
      );
      return;
    }
    setSubmitting(true);
    try {
      const response = await apiCall(
        apiKey,
        "/api/v1/features",
        {
          method: "POST",
          body: JSON.stringify({
            id: trimmedId,
            owner: trimmedOwner,
            valueType,
            defaultValue,
            description: description.trim() || undefined,
            project: mappedGbProjectId || undefined,
          }),
        },
        undefined
      );
      const created = (response as { feature?: Feature } | undefined)?.feature;
      if (!created?.id) {
        throw new Error("GrowthBook did not return a created feature");
      }
      setIssueData({
        linkedObject: {
          type: "feature",
          id: created.id,
          name: created.id,
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSubmitting(false);
    }
  };

  return (
    <Stack space="space.100">
      <Box>
        <Label labelFor="gb-new-feature-id">Feature key</Label>
        <Textfield
          isRequired
          value={featureId}
          onChange={(e) => setFeatureId(e.target.value)}
          placeholder="my-new-feature"
          isDisabled={submitting}
        />
        <HelperMessage>
          Letters, numbers, and _ . : | - characters only
        </HelperMessage>
      </Box>
      <Box>
        <Label labelFor="gb-new-feature-type">Value type</Label>
        <Select
          options={VALUE_TYPE_OPTIONS}
          value={VALUE_TYPE_OPTIONS.find((o) => o.value === valueType)}
          onChange={onValueTypeChange}
          isDisabled={submitting}
        />
      </Box>
      <Box>
        <Label labelFor="gb-new-feature-default">Default value</Label>
        <Textfield
          value={defaultValue}
          onChange={(e) => setDefaultValue(e.target.value)}
          isDisabled={submitting}
        />
      </Box>
      <Box>
        <Label labelFor="gb-new-feature-description">Description</Label>
        <Textfield
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional"
          isDisabled={submitting}
        />
      </Box>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      <Inline space="space.100">
        <Button
          appearance="primary"
          onClick={onSubmit}
          isDisabled={submitting || !featureId.trim()}
        >
          {submitting ? "Creating..." : "Create & link feature"}
        </Button>
        <Button appearance="subtle" onClick={onCancel} isDisabled={submitting}>
          Cancel
        </Button>
      </Inline>
    </Stack>
  );
}
