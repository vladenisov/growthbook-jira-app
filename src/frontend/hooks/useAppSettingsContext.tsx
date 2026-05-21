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
import { isStoredAppSettings, ProjectMapping } from "../../utils/types";
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
  saving: boolean;
  persistedState: Record<string, any>;
  updatePersistedState: (key: string, value: any) => void;
  customFieldId: string | undefined;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [persistedState, setPersistedState] = useState({});
  const [customFieldId, setCustomFieldId] = useState<string | undefined>("");
  const [fetchedCustomFieldId, setFetchedCustomFieldId] = useState(false);

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
        setError(undefined);
        setPersistedState(settings.persistedState);
        setCustomFieldId(settings.customFieldId);
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
      customFieldId ||
      fetchedCustomFieldId ||
      !localId
    )
      return;
    const fetchCustomFieldId = async () => {
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
        const customField = fieldsList.find(
          (field) =>
            field.schema?.custom ===
            localId.split("/").slice(0, 4).join("/") +
              "/growthbook-custom-field"
        );
        if (customField) {
          setCustomFieldId(customField.id);
        }
        setFetchedCustomFieldId(true);
      } catch (e) {
        console.error(e);
        setError("Error fetching list of custom fields. " + e);
      } finally {
        setLoading(false);
      }
    };
    fetchCustomFieldId();
  }, [
    customFieldId,
    loading,
    contextLoading,
    error,
    localId,
    fetchedCustomFieldId,
  ]);

  const pushUpdates = useMemo(
    () =>
      debounce(
        (
          apiKey,
          persistedState,
          customFieldId,
          ownerEmail,
          projectMappings
        ) => {
          setSaving(true);
          setError(undefined);
          invoke("updateAppSettings", {
            apiKey,
            persistedState,
            customFieldId,
            ownerEmail,
            projectMappings,
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
      customFieldId,
      ownerEmail,
      projectMappings
    );
  }, [
    apiKey,
    persistedState,
    customFieldId,
    ownerEmail,
    projectMappings,
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
        saving,
        persistedState,
        updatePersistedState,
        customFieldId,
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
