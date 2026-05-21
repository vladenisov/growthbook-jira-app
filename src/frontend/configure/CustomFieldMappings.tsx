import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  ErrorMessage,
  HelperMessage,
  Inline,
  Label,
  Lozenge,
  Select,
  Spinner,
  Stack,
  Text,
} from "@forge/react";
import { requestJira } from "@forge/bridge";
import { useAppSettingsContext } from "../hooks/useAppSettingsContext";
import { apiCall } from "../hooks/useApi";
import { CustomFieldMapping } from "../../utils/types";
import { SYNTHETIC_JIRA_FIELD_ISSUE_URL } from "../../utils/consts";

interface JiraField {
  id: string;
  name: string;
  custom: boolean;
}

interface GbCustomField {
  id: string;
  name: string;
  description?: string;
}

export default function CustomFieldMappings() {
  const { customFieldMappings, setCustomFieldMappings, apiKey } =
    useAppSettingsContext();

  const [jiraFields, setJiraFields] = useState<JiraField[]>([]);
  const [jiraLoading, setJiraLoading] = useState(true);
  const [jiraError, setJiraError] = useState<string | undefined>();

  const [gbFields, setGbFields] = useState<GbCustomField[]>([]);
  const [gbLoading, setGbLoading] = useState(false);
  const [gbError, setGbError] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setJiraLoading(true);
      setJiraError(undefined);
      try {
        const response = await requestJira(`/rest/api/3/field`, {
          headers: { Accept: "application/json" },
        });
        if (!response.ok) {
          throw new Error(
            `Jira returned ${response.status} ${response.statusText}`
          );
        }
        const data = (await response.json()) as Array<{
          id: string;
          name: string;
          custom?: boolean;
        }>;
        if (!cancelled)
          setJiraFields(
            data
              .map((f) => ({
                id: f.id,
                name: f.name,
                custom: f.custom === true,
              }))
              .sort((a, b) => a.name.localeCompare(b.name))
          );
      } catch (e) {
        if (!cancelled)
          setJiraError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setJiraLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!apiKey) return;
    let cancelled = false;
    (async () => {
      setGbLoading(true);
      setGbError(undefined);
      try {
        const data = (await apiCall(
          apiKey,
          "/api/v1/custom-fields",
          { method: "GET" },
          undefined
        )) as GbCustomField[] | { customFields?: GbCustomField[] } | undefined;
        const list = Array.isArray(data) ? data : data?.customFields || [];
        if (!cancelled) setGbFields(list);
      } catch (e) {
        if (!cancelled)
          setGbError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setGbLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  const onAdd = () => {
    setCustomFieldMappings([
      ...customFieldMappings,
      { jiraFieldId: "", gbCustomFieldId: "" },
    ]);
  };

  const onChange = (index: number, patch: Partial<CustomFieldMapping>) => {
    setCustomFieldMappings(
      customFieldMappings.map((m, i) => (i === index ? { ...m, ...patch } : m))
    );
  };

  const onRemove = (index: number) => {
    setCustomFieldMappings(customFieldMappings.filter((_, i) => i !== index));
  };

  const jiraOptions = [
    { label: "Issue URL (computed)", value: SYNTHETIC_JIRA_FIELD_ISSUE_URL },
    ...jiraFields.map((f) => ({
      label: f.custom ? `${f.name} (custom)` : f.name,
      value: f.id,
    })),
  ];
  const gbOptions = gbFields.map((f) => ({
    label: `${f.name} (${f.id})`,
    value: f.id,
  }));

  return (
    <Stack space="space.100">
      <Inline alignBlock="center" space="space.100">
        <Label labelFor="gb-custom-field-mappings">Custom field mappings</Label>
        <Lozenge appearance="new">Enterprise</Lozenge>
      </Inline>
      <HelperMessage>
        Optional. Copies a Jira issue field into a GrowthBook custom field when
        a feature is created from that issue. Available only on GrowthBook
        Enterprise — non-Enterprise instances will see an error loading
        GrowthBook custom fields.
      </HelperMessage>
      {jiraError && <ErrorMessage>{jiraError}</ErrorMessage>}
      {gbError && (
        <ErrorMessage>
          Could not load GrowthBook custom fields: {gbError}
        </ErrorMessage>
      )}
      {(jiraLoading || gbLoading) && (
        <Inline alignBlock="center" space="space.050">
          <Spinner />
          <Text>Loading fields...</Text>
        </Inline>
      )}
      {customFieldMappings.map((mapping, index) => (
        <Inline key={index} space="space.100" alignBlock="end">
          <Box xcss={{ width: "280px" }}>
            <Label labelFor={`gb-jira-field-${index}`}>Jira field</Label>
            <Select
              isSearchable
              options={jiraOptions}
              value={
                jiraOptions.find((o) => o.value === mapping.jiraFieldId) || null
              }
              onChange={(opt) =>
                onChange(index, { jiraFieldId: opt?.value || "" })
              }
              placeholder="Select Jira field"
            />
          </Box>
          <Box xcss={{ width: "280px" }}>
            <Label labelFor={`gb-gb-field-${index}`}>
              GrowthBook custom field
            </Label>
            <Select
              isSearchable
              options={gbOptions}
              value={
                gbOptions.find((o) => o.value === mapping.gbCustomFieldId) ||
                null
              }
              onChange={(opt) =>
                onChange(index, { gbCustomFieldId: opt?.value || "" })
              }
              placeholder="Select GrowthBook custom field"
            />
          </Box>
          <Button
            appearance="subtle"
            spacing="compact"
            onClick={() => onRemove(index)}
          >
            Remove
          </Button>
        </Inline>
      ))}
      <Inline>
        <Button
          appearance="default"
          onClick={onAdd}
          isDisabled={jiraLoading || gbLoading || !!gbError}
        >
          Add mapping
        </Button>
      </Inline>
    </Stack>
  );
}
