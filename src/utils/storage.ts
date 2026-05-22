import { kvs } from "@forge/kvs";
import { IssueData, StoredAppSettings } from "./types";

const APP_SETTINGS_KEY = "GB_APP_SETTINGS";
const APP_SETTINGS_DEFAULTS: StoredAppSettings = {
  apiKey: "",
  persistedState: {},
  customFieldId: "",
  featureCustomFieldId: "",
  experimentCustomFieldId: "",
  ownerEmail: "",
  projectMappings: [],
  customFieldMappings: [],
  copyIssueDescription: false,
};

export async function getAppSettings() {
  const storedData = (await kvs.getSecret(APP_SETTINGS_KEY)) || {};
  // Load defaults for any missing fields to prevent errors
  return { ...APP_SETTINGS_DEFAULTS, ...storedData };
}

export async function updateAppSettings(
  partialSettings: Partial<StoredAppSettings>
) {
  const currentSettings = await getAppSettings();
  await kvs.setSecret(APP_SETTINGS_KEY, {
    ...currentSettings,
    ...partialSettings,
  });
  return true;
}

export async function getIssueData(issueKey: string) {
  return (await kvs.get(issueKey)) || {};
}

export async function setIssueData(issueKey: string, issueData: IssueData) {
  await kvs.set(issueKey, issueData);
  return true;
}
