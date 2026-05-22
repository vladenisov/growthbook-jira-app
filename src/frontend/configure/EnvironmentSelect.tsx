import React, { useEffect } from "react";
import {
  ErrorMessage,
  HelperMessage,
  Inline,
  Label,
  Select,
  Spinner,
  Stack,
  Text,
} from "@forge/react";
import { useAppSettingsContext } from "../hooks/useAppSettingsContext";
import useApi from "../hooks/useApi";

interface GbEnvironment {
  id: string;
  description?: string;
}

interface GbEnvironmentsResponse {
  environments: GbEnvironment[];
}

export default function EnvironmentSelect() {
  const { apiKey, primaryEnvironment, setPrimaryEnvironment } =
    useAppSettingsContext();
  const {
    data,
    isLoading,
    error,
  } = useApi<GbEnvironmentsResponse>(apiKey ? "/api/v1/environments" : null);

  const environments = data?.environments || [];
  const options = environments.map((environment) => ({
    label: environment.description
      ? `${environment.id} - ${environment.description}`
      : environment.id,
    value: environment.id,
  }));

  useEffect(() => {
    if (primaryEnvironment || environments.length === 0) return;
    const production = environments.find(
      (environment) => environment.id === "production"
    );
    setPrimaryEnvironment((production || environments[0]).id);
  }, [environments, primaryEnvironment, setPrimaryEnvironment]);

  return (
    <Stack space="space.050">
      <Label labelFor="gb-primary-environment">Main environment</Label>
      <Select
        isSearchable
        options={options}
        value={
          options.find((option) => option.value === primaryEnvironment) || null
        }
        onChange={(option) => setPrimaryEnvironment(option?.value || "")}
        placeholder={
          apiKey ? "Select GrowthBook environment" : "Enter API key first"
        }
        isDisabled={!apiKey || isLoading}
      />
      <HelperMessage>
        Used for feature rule counts and feature details shown in Jira.
      </HelperMessage>
      {isLoading && (
        <Inline alignBlock="center" space="space.050">
          <Spinner size="small" />
          <Text size="small">Loading environments...</Text>
        </Inline>
      )}
      {error && <ErrorMessage>{error.message}</ErrorMessage>}
    </Stack>
  );
}
