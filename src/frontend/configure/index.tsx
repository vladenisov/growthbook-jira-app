import React from "react";
import ForgeReconciler, {
  Box,
  ErrorMessage,
  Inline,
  Label,
  Spinner,
  Stack,
  Text,
  Textfield,
  HelperMessage,
  Lozenge,
  Toggle,
} from "@forge/react";
import {
  AppSettingsContextProvider,
  useAppSettingsContext,
} from "../hooks/useAppSettingsContext";
import { Icon } from "@forge/react";
import GrowthBookLink from "../widget/GrowthBookLink";
import ProjectMappings from "./ProjectMappings";
import CustomFieldMappings from "./CustomFieldMappings";
import EnvironmentSelect from "./EnvironmentSelect";

const App = () => {
  const {
    apiKey,
    setApiKey,
    accessMode,
    setAccessMode,
    ownerEmail,
    setOwnerEmail,
    copyIssueDescription,
    setCopyIssueDescription,
    error,
    loading,
    saving,
  } = useAppSettingsContext();

  if (loading) {
    return (
      <Inline>
        <Spinner />
        <Text>Loading...</Text>
      </Inline>
    );
  }

  const writeMode = accessMode === "write";

  return (
    <Box>
      <Box paddingBlockEnd="space.150">
        <Inline alignBlock="center" space="space.100">
          <Toggle
            id="gb-access-mode"
            isChecked={writeMode}
            onChange={(e) =>
              setAccessMode(e.target.checked ? "write" : "readonly")
            }
          />
          <Label labelFor="gb-access-mode">
            Write mode
          </Label>
          <Lozenge appearance={writeMode ? "inprogress" : "default"}>
            {writeMode ? "write" : "readonly"}
          </Lozenge>
        </Inline>
        <HelperMessage>
          Read-only mode can link Jira issues to existing GrowthBook objects.
          Write mode also enables creating new GrowthBook features from Jira.
        </HelperMessage>
      </Box>
      <Box paddingBlockEnd="space.150">
        <Inline>
          <Label labelFor="gb-api-key-input">API Key</Label>
        </Inline>
        <Textfield
          autoFocus
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
        <HelperMessage>
          <Stack space="space.050">
            {writeMode ? (
              <Text>
                Use a token with at least the <Lozenge>engineer</Lozenge> role
                to create new features from Jira.
              </Text>
            ) : (
              <Text>
                A <Lozenge>readonly</Lozenge> token is enough for linking
                issues to existing features and experiments.
              </Text>
            )}
            <Inline alignBlock="center" space="space.050">
              <Text>Generate an API key at</Text>
              <GrowthBookLink path="/settings/keys">
                /settings/keys
              </GrowthBookLink>
            </Inline>
          </Stack>
        </HelperMessage>
      </Box>
      <Box paddingBlockStart="space.150">
        <EnvironmentSelect />
      </Box>
      {writeMode && (
        <>
          <Box paddingBlockStart="space.150">
            <Inline>
              <Label labelFor="gb-owner-email-input">Owner email</Label>
            </Inline>
            <Textfield
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              placeholder="you@example.com"
            />
            <HelperMessage>
              Used as the feature owner when creating new features from Jira.
            </HelperMessage>
          </Box>
          <Box paddingBlockStart="space.150">
            <Inline alignBlock="center" space="space.100">
              <Toggle
                id="gb-copy-issue-description"
                isChecked={copyIssueDescription}
                onChange={(e) => setCopyIssueDescription(!!e.target.checked)}
              />
              <Label labelFor="gb-copy-issue-description">
                Copy Jira issue description into new GrowthBook features
              </Label>
            </Inline>
            <HelperMessage>
              When enabled, opening the create-feature form on an issue
              pre-fills the description with the issue's body. You can still
              edit it before submitting.
            </HelperMessage>
          </Box>
          <Box paddingBlockStart="space.150">
            <ProjectMappings />
          </Box>
          <Box paddingBlockStart="space.150">
            <CustomFieldMappings />
          </Box>
        </>
      )}
      <Box>
        {error ? (
          <Text>There was an error:</Text>
        ) : saving ? (
          <Text>
            <Spinner />
            Saving changes...
          </Text>
        ) : (
          <Text>
            <Icon label="checkmark" glyph="check" />
            Settings synced
          </Text>
        )}
        {error && <ErrorMessage>{error}</ErrorMessage>}
      </Box>
    </Box>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <AppSettingsContextProvider>
      <App />
    </AppSettingsContextProvider>
  </React.StrictMode>
);
