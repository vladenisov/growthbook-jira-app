import Resolver from "@forge/resolver";
import {
  getAppSettings,
  getIssueData,
  setIssueData,
  updateAppSettings,
} from "../utils/storage";
import { route, asApp } from "@forge/api";
import { getGbLink } from "../utils";
import {
  getLinkedObjects,
  IssueData,
  isIssueData,
  LinkedObject,
} from "../utils/types";

function buildFieldValue(obj: LinkedObject) {
  return {
    objectType: obj.type,
    objectId: obj.id,
    objectName: obj.name,
    gbLink: getGbLink(
      `/${obj.type === "feature" ? obj.type + "s" : obj.type}/${obj.id}`
    ),
  };
}

const resolver = new Resolver();

resolver.define("getAppSettings", async () => {
  const settings = await getAppSettings();
  return settings;
});

resolver.define("updateAppSettings", async (req) => {
  const updates = req.payload || {};
  // TODO: validation
  await updateAppSettings(updates);
  return true;
});

resolver.define("getIssueData", async (req) => {
  // TODO: validation
  return getIssueData(req.payload.issueId);
});

resolver.define("setIssueData", async (req) => {
  const { issueId, issueData } = req.payload;
  if (!isIssueData(issueData)) return false;
  const normalized: IssueData = {
    linkedObjects: getLinkedObjects(issueData),
  };
  const [setIssueDataResponse, settings] = await Promise.all([
    setIssueData(issueId, normalized),
    getAppSettings(),
  ]);
  if (!setIssueDataResponse) return setIssueDataResponse;

  const featureFieldId =
    settings.featureCustomFieldId || settings.customFieldId;
  const experimentFieldId = settings.experimentCustomFieldId;
  if (!featureFieldId && !experimentFieldId) return setIssueDataResponse;

  const linkedObjects = normalized.linkedObjects || [];
  const firstFeature = linkedObjects.find((o) => o.type === "feature");
  const firstExperiment = linkedObjects.find((o) => o.type === "experiment");

  const updates: Array<{
    customField: string;
    issueIds: string[];
    value: ReturnType<typeof buildFieldValue> | null;
  }> = [];
  if (featureFieldId) {
    updates.push({
      customField: featureFieldId,
      issueIds: [issueId],
      value: firstFeature ? buildFieldValue(firstFeature) : null,
    });
  }
  if (experimentFieldId) {
    updates.push({
      customField: experimentFieldId,
      issueIds: [issueId],
      value: firstExperiment ? buildFieldValue(firstExperiment) : null,
    });
  }

  const requestJiraResponse = await asApp().requestJira(
    route`/rest/api/2/app/field/value`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ updates }),
    }
  );
  return requestJiraResponse.status < 300;
});

export const handler = resolver.getDefinitions();
