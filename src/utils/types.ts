export interface ProjectMapping {
  jiraProjectId: string;
  gbProjectId: string;
}

export interface CustomFieldMapping {
  jiraFieldId: string;
  gbCustomFieldId: string;
}

export type AccessMode = "readonly" | "write";

export interface StoredAppSettings {
  apiKey: string;
  persistedState: Record<string, any>;
  // Legacy: pre-split value that pointed at growthbook-custom-field. Read as
  // featureCustomFieldId if the new key is missing.
  customFieldId?: string;
  featureCustomFieldId?: string;
  experimentCustomFieldId?: string;
  ownerEmail?: string;
  projectMappings?: ProjectMapping[];
  customFieldMappings?: CustomFieldMapping[];
  copyIssueDescription?: boolean;
  accessMode?: AccessMode;
  primaryEnvironment?: string;
}

export function isStoredAppSettings(
  value: unknown
): value is StoredAppSettings {
  if (typeof value !== "object" || value === null) return false;
  const typecast = value as StoredAppSettings;
  if (typeof typecast.apiKey !== "string") return false;
  if (
    typeof typecast.persistedState !== "object" ||
    typecast.persistedState === null
  )
    return false;
  if (
    typecast.customFieldId !== undefined &&
    typeof typecast.customFieldId !== "string"
  )
    return false;
  if (
    typecast.featureCustomFieldId !== undefined &&
    typeof typecast.featureCustomFieldId !== "string"
  )
    return false;
  if (
    typecast.experimentCustomFieldId !== undefined &&
    typeof typecast.experimentCustomFieldId !== "string"
  )
    return false;
  if (
    typecast.ownerEmail !== undefined &&
    typeof typecast.ownerEmail !== "string"
  )
    return false;
  if (typecast.projectMappings !== undefined) {
    if (!Array.isArray(typecast.projectMappings)) return false;
    for (const m of typecast.projectMappings) {
      if (
        !m ||
        typeof m !== "object" ||
        typeof m.jiraProjectId !== "string" ||
        typeof m.gbProjectId !== "string"
      )
        return false;
    }
  }
  if (typecast.customFieldMappings !== undefined) {
    if (!Array.isArray(typecast.customFieldMappings)) return false;
    for (const m of typecast.customFieldMappings) {
      if (
        !m ||
        typeof m !== "object" ||
        typeof m.jiraFieldId !== "string" ||
        typeof m.gbCustomFieldId !== "string"
      )
        return false;
    }
  }
  if (
    typecast.copyIssueDescription !== undefined &&
    typeof typecast.copyIssueDescription !== "boolean"
  )
    return false;
  if (
    typecast.accessMode !== undefined &&
    !["readonly", "write"].includes(typecast.accessMode)
  )
    return false;
  if (
    typecast.primaryEnvironment !== undefined &&
    typeof typecast.primaryEnvironment !== "string"
  )
    return false;

  return true;
}

interface LinkedFeature {
  type: "feature";
  id: string;
  name?: string;
}

interface LinkedExperiment {
  type: "experiment";
  id: string;
  name?: string;
}

export type LinkedObject = LinkedFeature | LinkedExperiment;

export function isLinkedObject(value: unknown): value is LinkedObject {
  if (typeof value !== "object" || value === null) return false;
  const typecast = value as LinkedObject;
  if (!["feature", "experiment"].includes(typecast.type)) return false;
  if (typeof typecast.id !== "string") return false;
  return true;
}

type ValueType = "boolean" | "string" | "number" | "json";
interface SavedGroupTargeting {
  matchType: "all" | "any" | "none";
  savedGroups: string[];
}

export interface FeatureForceRule {
  type: "force";
  id: string;
  description: string;
  condition: string;
  enabled: boolean;
  value: string;
  savedGroupTargeting?: SavedGroupTargeting[];
}

export interface FeatureRolloutRule {
  type: "rollout";
  id: string;
  description: string;
  condition: string;
  enabled: boolean;
  value: string;
  coverage: number;
  hashAttribute: string;
}

export interface FeatureExperimentRule {
  type: "experiment";
  id: string;
  description: string;
  condition: string;
  enabled: boolean;
  trackingKey?: string;
  hashAttribute?: string;
  fallbackAttribute?: string;
  coverage?: number;
  value?: Array<{ value: string; weight: number; name?: string }>;
}

export interface FeatureExperimentRefRule {
  type: "experiment-ref";
  id: string;
  description: string;
  enabled: boolean;
  variations: Array<{ value: string; variationId: string }>;
  experimentId: string;
}

export type FeatureRule =
  | FeatureForceRule
  | FeatureRolloutRule
  | FeatureExperimentRule
  | FeatureExperimentRefRule;

export interface FeatureEnvironment {
  enabled: boolean;
  defaultValue: string;
  rules: FeatureRule[];
  definition?: string;
}

export interface FeatureRevision {
  version: number;
  comment: string;
  date: string;
  publishedBy: string;
}
export interface Feature {
  id: string;
  archived: boolean;
  description: string;
  dateCreated: string;
  dateUpdated: string;
  owner: string;
  project: string;
  tags: string[];
  environments: Record<string, FeatureEnvironment>;
  revision: FeatureRevision;
  valueType: ValueType;
  defaultValue: string;
  revisions?: Array<{
    baseVersion: number;
    version: number;
    comment: string;
    date: string;
    status: string;
    publishedBy?: string;
    rules: FeatureRule[];
  }>;
}

export interface FeatureResponse {
  feature: Feature;
}

interface ExperimentPhase {
  name: string;
  dateStarted: string;
  dateEnded: string;
  reasonForStopping: string;
  coverage: number;
  trafficSplit: Array<{ variationId: string; weight: number }>;
  targetingCondition: string;
  savedGroupTargeting?: SavedGroupTargeting;
}

export interface Experiment {
  id: string;
  dateCreated: string;
  dateUpdated: string;
  archived: boolean;
  trackingKey: string;
  name: string;
  type: "standard" | "multi-armed-bandit";
  hashAttribute: string;
  owner: string;
  status: string;
  variations: Array<{
    variationId: string;
    key: string;
    name: string;
    description: string;
  }>;
  phases: ExperimentPhase[];
  resultSummary?: {
    status: string;
    winner: string;
    conclusions: string;
    releasedVariationId: string;
    excludeFromPayload: boolean;
  };
  linkedFeatures?: string[];
  hasVisualChangesets?: boolean;
  hasURLRedirects?: boolean;
  enhancedStatus?: {
    status: string;
    detailedStatus?: string;
  };
}
export interface ExperimentResponse {
  experiment: Experiment;
}

export interface IssueData {
  linkedObjects?: LinkedObject[];
  // Legacy: a single linked object. Kept for backward compatibility with data
  // stored before multi-link support; readers should normalize via
  // getLinkedObjects() and writers should populate linkedObjects.
  linkedObject?: LinkedObject;
}

export function isIssueData(value: unknown): value is IssueData {
  if (typeof value !== "object" || value === null) return false;
  const typecast = value as IssueData;
  if (
    typeof typecast.linkedObject !== "undefined" &&
    !isLinkedObject(typecast.linkedObject)
  )
    return false;
  if (typeof typecast.linkedObjects !== "undefined") {
    if (!Array.isArray(typecast.linkedObjects)) return false;
    for (const obj of typecast.linkedObjects) {
      if (!isLinkedObject(obj)) return false;
    }
  }
  return true;
}

export function getLinkedObjects(data: IssueData | undefined | null): LinkedObject[] {
  if (!data) return [];
  if (Array.isArray(data.linkedObjects)) return data.linkedObjects;
  if (data.linkedObject) return [data.linkedObject];
  return [];
}
