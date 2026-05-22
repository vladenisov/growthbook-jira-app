import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  ReactNode,
} from "react";
import debounce from "debounce";
import { invoke, requestJira } from "@forge/bridge";
import {
  CustomFieldMapping,
  isStoredAppSettings,
  ProjectMapping,
} from "../../utils/types";
import { useJiraContext } from "./useJiraContext";

interface AppSettings {
  loading: boolean;
  error: string | undefined;
  apiKey: string;
  setApiKey: (value: string) => void;
  ownerEmail: string;
  setOwnerEmail: (value: string) => void;
  projectMappings: ProjectMapping[];
  setProjectMappings: (value: ProjectMapping[]) => void;
  customFieldMappings: CustomFieldMapping[];
  setCustomFieldMappings: (value: CustomFieldMapping[]) => void;
  copyIssueDescription: boolean;
  setCopyIssueDescription: (value: boolean) => void;
  saving: boolean;
  persistedState: Record<string, any>;
  updatePersistedState: (key: string, value: any) => void;
  featureCustomFieldId: string | undefined;
  experimentCustomFieldId: string | undefined;
}

const AppSettingsContext = createContext<AppSettings | null>(null);

export const AppSettingsContextProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [apiKey, setApiKey] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [projectMappings, setProjectMappings] = useState<ProjectMapping[]>([]);
  const [customFieldMappings, setCustomFieldMappings] = useState<
    CustomFieldMapping[]
  >([]);
  const [copyIssueDescription, setCopyIssueDescription] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [persistedState, setPersistedState] = useState({});
  const [featureCustomFieldId, setFeatureCustomFieldId] = useState<
    string | undefined
  >("");
  const [experimentCustomFieldId, setExperimentCustomFieldId] = useState<
    string | undefined
  >("");
  const [fetchedCustomFieldIds, setFetchedCustomFieldIds] = useState(false);

  const {
    context: { localId },
    loading: contextLoading,
  } = useJiraContext();

  useEffect(() => {
    setLoading(true);
    invoke("getAppSettings", {})
      .then((settings) => {
        if (!isStoredAppSettings(settings)) {
          setError(
            `Failed to load settings. Got invalid result: ${JSON.stringify(
              settings
            )}`
          );
          setLoading(false);
          return;
        }
        setApiKey(settings.apiKey);
        setOwnerEmail(settings.ownerEmail || "");
        setProjectMappings(settings.projectMappings || []);
        setCustomFieldMappings(settings.customFieldMappings || []);
        setCopyIssueDescription(settings.copyIssueDescription === true);
        setError(undefined);
        setPersistedState(settings.persistedState);
        setFeatureCustomFieldId(
          settings.featureCustomFieldId || settings.customFieldId || ""
        );
        setExperimentCustomFieldId(settings.experimentCustomFieldId || "");
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setError(
          "Error initializing GrowthBook integration. Please try again later"
        );
      });
  }, []);

  useEffect(() => {
    if (
      loading ||
      contextLoading ||
      error ||
      fetchedCustomFieldIds ||
      (featureCustomFieldId && experimentCustomFieldId) ||
      !localId
    )
      return;
    const fetchCustomFieldIds = async () => {
      setLoading(true);
      try {
        const response = await requestJira(`/rest/api/2/field`, {
          headers: {
            Accept: "application/json",
          },
        });
        const fieldsList = (await response.json()) as Array<{
          id: string;
          schema?: Record<string, unknown>;
        }>;
        const prefix = localId.split("/").slice(0, 4).join("/");
        const featureField = fieldsList.find(
          (field) =>
            field.schema?.custom === `${prefix}/growthbook-custom-field`
        );
        const experimentField = fieldsList.find(
          (field) =>
            field.schema?.custom === `${prefix}/growthbook-experiment-field`
        );
        if (featureField && !featureCustomFieldId) {
          setFeatureCustomFieldId(featureField.id);
        }
        if (experimentField && !experimentCustomFieldId) {
          setExperimentCustomFieldId(experimentField.id);
        }
        setFetchedCustomFieldIds(true);
      } catch (e) {
        console.error(e);
        setError("Error fetching list of custom fields. " + e);
      } finally {
        setLoading(false);
      }
    };
    fetchCustomFieldIds();
  }, [
    featureCustomFieldId,
    experimentCustomFieldId,
    loading,
    contextLoading,
    error,
    localId,
    fetchedCustomFieldIds,
  ]);

  const pushUpdates = useMemo(
    () =>
      debounce(
        (
          apiKey,
          persistedState,
          featureCustomFieldId,
          experimentCustomFieldId,
          ownerEmail,
          projectMappings,
          customFieldMappings,
          copyIssueDescription
        ) => {
          setSaving(true);
          setError(undefined);
          invoke("updateAppSettings", {
            apiKey,
            persistedState,
            featureCustomFieldId,
            experimentCustomFieldId,
            ownerEmail,
            projectMappings,
            customFieldMappings,
            copyIssueDescription,
          }).then((result) => {
            if (result !== true) setError("Failed to save settings");
            setSaving(false);
          });
        },
        1000,
        { immediate: false }
      ),
    []
  );

  useEffect(() => {
    if (loading) return;
    pushUpdates(
      apiKey,
      persistedState,
      featureCustomFieldId,
      experimentCustomFieldId,
      ownerEmail,
      projectMappings,
      customFieldMappings,
      copyIssueDescription
    );
  }, [
    apiKey,
    persistedState,
    featureCustomFieldId,
    experimentCustomFieldId,
    ownerEmail,
    projectMappings,
    customFieldMappings,
    copyIssueDescription,
    loading,
  ]);

  const updatePersistedState = (key: string, value: any) => {
    setPersistedState({ ...persistedState, [key]: value });
  };

  return (
    <AppSettingsContext.Provider
      value={{
        loading,
        error,
        apiKey,
        setApiKey,
        ownerEmail,
        setOwnerEmail,
        projectMappings,
        setProjectMappings,
        customFieldMappings,
        setCustomFieldMappings,
        copyIssueDescription,
        setCopyIssueDescription,
        saving,
        persistedState,
        updatePersistedState,
        featureCustomFieldId,
        experimentCustomFieldId,
      }}
    >
      {children}
    </AppSettingsContext.Provider>
  );
};

export const useAppSettingsContext = () => {
  const context = useContext(AppSettingsContext);

  if (!context)
    throw new Error(
      "AppSettingsContext must be called from within the AppSettingsContextProvider"
    );

  return context;
};
