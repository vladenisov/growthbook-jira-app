import React, { useEffect, useState } from "react";
import { requestJira } from "@forge/bridge";
import {
  Box,
  Button,
  ErrorMessage,
  HelperMessage,
  Inline,
  Label,
  Select,
  Spinner,
  Stack,
  Text,
  TextArea,
  Textfield,
} from "@forge/react";
import { apiCall } from "../hooks/useApi";
import { useAppSettingsContext } from "../hooks/useAppSettingsContext";
import { useIssueContext } from "../hooks/useIssueContext";
import { useJiraContext } from "../hooks/useJiraContext";
import { Feature } from "../../utils/types";
import { adfToMarkdown, jiraFieldToString } from "../../utils";
import { SYNTHETIC_JIRA_FIELD_ISSUE_URL } from "../../utils/consts";

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

interface CreateFeatureFormProps {
  onCancel: () => void;
  onCreated?: () => void;
}

export default function CreateFeatureForm({
  onCancel,
  onCreated,
}: CreateFeatureFormProps) {
  const {
    apiKey,
    ownerEmail,
    projectMappings,
    customFieldMappings,
    copyIssueDescription,
  } = useAppSettingsContext();
  const { issueId, addLinkedObject } = useIssueContext();
  const {
    context: { extension, siteUrl },
  } = useJiraContext();
  const jiraProjectId: string | undefined = extension?.project?.id;
  const issueKey: string | undefined = extension?.issue?.key;
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
  const [descriptionPrefilled, setDescriptionPrefilled] = useState(false);
  const [descriptionLoading, setDescriptionLoading] = useState(false);
  const [descriptionPrefillError, setDescriptionPrefillError] = useState<
    string | undefined
  >();

  useEffect(() => {
    if (!copyIssueDescription || !issueId || descriptionPrefilled) {
      return;
    }
    let cancelled = false;
    setDescriptionLoading(true);
    setDescriptionPrefillError(undefined);
    (async () => {
      try {
        const response = await requestJira(
          `/rest/api/3/issue/${encodeURIComponent(issueId)}?fields=description`,
          { headers: { Accept: "application/json" } }
        );
        if (!response.ok) {
          throw new Error(
            `Jira returned ${response.status} ${response.statusText}`
          );
        }
        const data = (await response.json()) as {
          fields?: { description?: unknown };
        };
        const md = adfToMarkdown(data.fields?.description);
        if (cancelled) return;
        if (md) setDescription(md);
      } catch (e) {
        if (!cancelled)
          setDescriptionPrefillError(
            e instanceof Error ? e.message : String(e)
          );
      } finally {
        if (!cancelled) {
          setDescriptionLoading(false);
          setDescriptionPrefilled(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [copyIssueDescription, issueId, descriptionPrefilled]);

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
      let customFields: Record<string, string> | undefined;
      const activeFieldMappings = customFieldMappings.filter(
        (m) => m.jiraFieldId && m.gbCustomFieldId
      );
      if (activeFieldMappings.length > 0) {
        const built: Record<string, string> = {};

        for (const m of activeFieldMappings) {
          if (m.jiraFieldId === SYNTHETIC_JIRA_FIELD_ISSUE_URL) {
            if (siteUrl && issueKey) {
              built[m.gbCustomFieldId] = `${siteUrl}/browse/${issueKey}`;
            }
          }
        }

        const realFieldMappings = activeFieldMappings.filter(
          (m) => m.jiraFieldId !== SYNTHETIC_JIRA_FIELD_ISSUE_URL
        );
        if (realFieldMappings.length > 0 && issueId) {
          const fieldsParam = Array.from(
            new Set(realFieldMappings.map((m) => m.jiraFieldId))
          ).join(",");
          const issueResponse = await requestJira(
            `/rest/api/3/issue/${encodeURIComponent(
              issueId
            )}?fields=${encodeURIComponent(fieldsParam)}`,
            { headers: { Accept: "application/json" } }
          );
          if (!issueResponse.ok) {
            throw new Error(
              `Failed to read Jira fields for custom field mapping: ${issueResponse.status} ${issueResponse.statusText}`
            );
          }
          const issueData = (await issueResponse.json()) as {
            fields?: Record<string, unknown>;
          };
          const fields = issueData.fields || {};
          for (const m of realFieldMappings) {
            const value = jiraFieldToString(fields[m.jiraFieldId]);
            if (value) built[m.gbCustomFieldId] = value;
          }
        }
        if (Object.keys(built).length > 0) customFields = built;
      }

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
            customFields,
          }),
        },
        undefined
      );
      const created = (response as { feature?: Feature } | undefined)?.feature;
      if (!created?.id) {
        throw new Error("GrowthBook did not return a created feature");
      }
      addLinkedObject({
        type: "feature",
        id: created.id,
        name: created.id,
      });
      onCreated?.();
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
        <Inline alignBlock="center" space="space.100" spread="space-between">
          <Label labelFor="gb-new-feature-description">Description</Label>
          {descriptionLoading && (
            <Inline alignBlock="center" space="space.050">
              <Spinner size="small" />
              <Text size="small">Loading issue description...</Text>
            </Inline>
          )}
        </Inline>
        <TextArea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional. Markdown supported."
          isDisabled={submitting || descriptionLoading}
          minimumRows={4}
        />
        {descriptionPrefillError && (
          <HelperMessage>
            Could not pre-fill from the Jira issue: {descriptionPrefillError}
          </HelperMessage>
        )}
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
