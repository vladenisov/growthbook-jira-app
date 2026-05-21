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
} from "@forge/react";
import {
  AppSettingsContextProvider,
  useAppSettingsContext,
} from "../hooks/useAppSettingsContext";
import { Icon } from "@forge/react";
import GrowthBookLink from "../widget/GrowthBookLink";
import ProjectMappings from "./ProjectMappings";

const App = () => {
  const {
    apiKey,
    setApiKey,
    ownerEmail,
    setOwnerEmail,
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

  return (
    <Box>
      <Box>
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
            <Text>
              A <Lozenge>readonly</Lozenge> token is enough for linking issues
              to existing features and experiments. To create new features from
              Jira you need a token with at least the{" "}
              <Lozenge>engineer</Lozenge> role and the owner email filled in
              below.
            </Text>
            <Inline alignBlock="center" space="space.050">
              <Text>Generate an API key at</Text>
              <GrowthBookLink path="/settings/keys">
                /settings/keys
              </GrowthBookLink>
            </Inline>
          </Stack>
        </HelperMessage>
      </Box>
      <Box>
        <Inline>
          <Label labelFor="gb-owner-email-input">Owner email</Label>
        </Inline>
        <Textfield
          value={ownerEmail}
          onChange={(e) => setOwnerEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <HelperMessage>
          Only needed for creating new features from Jira — used as the feature
          owner. Leave empty if you only link to existing GrowthBook objects.
        </HelperMessage>
      </Box>
      <Box paddingBlockStart="space.150">
        <ProjectMappings />
      </Box>
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
