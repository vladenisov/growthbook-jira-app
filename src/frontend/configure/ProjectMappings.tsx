import React, { useEffect, useState } from "react";
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
} from "@forge/react";
import { requestJira } from "@forge/bridge";
import { useAppSettingsContext } from "../hooks/useAppSettingsContext";
import useApi from "../hooks/useApi";
import { ProjectMapping } from "../../utils/types";

interface JiraProject {
  id: string;
  key: string;
  name: string;
}

interface GbProject {
  id: string;
  name: string;
}

interface GbProjectsResponse {
  projects: GbProject[];
}

export default function ProjectMappings() {
  const { projectMappings, setProjectMappings, apiKey } =
    useAppSettingsContext();

  const [jiraProjects, setJiraProjects] = useState<JiraProject[]>([]);
  const [jiraLoading, setJiraLoading] = useState(true);
  const [jiraError, setJiraError] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setJiraLoading(true);
      setJiraError(undefined);
      try {
        const collected: JiraProject[] = [];
        let startAt = 0;
        const maxResults = 50;
        while (true) {
          const response = await requestJira(
            `/rest/api/3/project/search?startAt=${startAt}&maxResults=${maxResults}`,
            { headers: { Accept: "application/json" } }
          );
          if (!response.ok) {
            throw new Error(
              `Failed to load Jira projects: ${response.status} ${response.statusText}`
            );
          }
          const data = (await response.json()) as {
            values: JiraProject[];
            isLast?: boolean;
            total?: number;
          };
          collected.push(
            ...data.values.map((p) => ({ id: p.id, key: p.key, name: p.name }))
          );
          if (data.isLast || data.values.length < maxResults) break;
          startAt += data.values.length;
        }
        if (!cancelled) setJiraProjects(collected);
      } catch (e) {
        if (!cancelled)
          setJiraError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setJiraLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const {
    data: gbData,
    isLoading: gbLoading,
    error: gbError,
  } = useApi<GbProjectsResponse>(
    apiKey ? "/api/v1/projects" : null,
    undefined,
    "projects"
  );
  const gbProjects = gbData?.projects || [];

  const onAdd = () => {
    setProjectMappings([
      ...projectMappings,
      { jiraProjectId: "", gbProjectId: "" },
    ]);
  };

  const onChange = (index: number, patch: Partial<ProjectMapping>) => {
    const next = projectMappings.map((m, i) =>
      i === index ? { ...m, ...patch } : m
    );
    setProjectMappings(next);
  };

  const onRemove = (index: number) => {
    setProjectMappings(projectMappings.filter((_, i) => i !== index));
  };

  const jiraOptions = jiraProjects.map((p) => ({
    label: `${p.name} (${p.key})`,
    value: p.id,
  }));
  const gbOptions = gbProjects.map((p) => ({ label: p.name, value: p.id }));

  return (
    <Stack space="space.100">
      <Label labelFor="gb-project-mappings">Project mappings</Label>
      <HelperMessage>
        Optional. Maps a Jira project to a GrowthBook project so features
        created from Jira land in the right GrowthBook project. Issues from a
        Jira project without a mapping create features with no project assigned.
      </HelperMessage>
      {jiraError && <ErrorMessage>{jiraError}</ErrorMessage>}
      {gbError && <ErrorMessage>{gbError.message}</ErrorMessage>}
      {(jiraLoading || gbLoading) && (
        <Inline alignBlock="center" space="space.050">
          <Spinner />
          <Text>Loading projects...</Text>
        </Inline>
      )}
      {projectMappings.map((mapping, index) => (
        <Inline key={index} space="space.100" alignBlock="end">
          <Box xcss={{ width: "280px" }}>
            <Label labelFor={`gb-jira-project-${index}`}>Jira project</Label>
            <Select
              isSearchable
              options={jiraOptions}
              value={
                jiraOptions.find((o) => o.value === mapping.jiraProjectId) ||
                null
              }
              onChange={(opt) =>
                onChange(index, { jiraProjectId: opt?.value || "" })
              }
              placeholder="Select Jira project"
            />
          </Box>
          <Box xcss={{ width: "280px" }}>
            <Label labelFor={`gb-gb-project-${index}`}>
              GrowthBook project
            </Label>
            <Select
              isSearchable
              options={gbOptions}
              value={
                gbOptions.find((o) => o.value === mapping.gbProjectId) || null
              }
              onChange={(opt) =>
                onChange(index, { gbProjectId: opt?.value || "" })
              }
              placeholder="Select GrowthBook project"
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
          isDisabled={jiraLoading || gbLoading}
        >
          Add mapping
        </Button>
      </Inline>
    </Stack>
  );
}
