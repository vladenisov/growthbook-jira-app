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
  isLinkedObject,
} from "../utils/types";

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
  const [setIssueDataResponse, { customFieldId }] = await Promise.all([
    setIssueData(issueId, normalized),
    getAppSettings(),
  ]);
  if (!setIssueDataResponse || !customFieldId) return setIssueDataResponse;
  const obj = normalized.linkedObjects?.[0];
  const requestJiraResponse = await asApp().requestJira(
    route`/rest/api/2/app/field/value`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        updates: [
          {
            customField: customFieldId,
            issueIds: [issueId],
            value: isLinkedObject(obj)
              ? {
                  objectType: obj.type,
                  objectId: obj.id,
                  objectName: obj.name,
                  gbLink: getGbLink(
                    `/${obj.type === "feature" ? obj.type + "s" : obj.type}/${
                      obj.id
                    }`
                  ),
                }
              : null,
          },
        ],
      }),
    }
  );
  return requestJiraResponse.status < 300;
});

export const handler = resolver.getDefinitions();
