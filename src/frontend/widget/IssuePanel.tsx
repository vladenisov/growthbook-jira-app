import React, { useState } from "react";
import LoadingSpinner from "./LoadingSpinner";
import { Box, Button, ErrorMessage, Inline, Stack } from "@forge/react";
import { useIssueContext } from "../hooks/useIssueContext";
import UnlinkedIssue from "./UnlinkedIssue";
import LinkedObjectInfo from "./LinkedObjectInfo";

export default function IssuePanel() {
  const {
    setIssueData,
    linkedObjects,
    removeLinkedObjectAt,
    loading: issueDataLoading,
    error: issueDataError,
  } = useIssueContext();
  const [addingAnother, setAddingAnother] = useState(false);

  if (issueDataLoading)
    return <LoadingSpinner text="Loading your saved data..." />;

  if (issueDataError) {
    return (
      <Inline
        shouldWrap
        alignBlock="center"
        space="space.150"
        rowSpace="space.0"
      >
        <ErrorMessage>{issueDataError}</ErrorMessage>
        <Button onClick={() => setIssueData({})} spacing="compact">
          Clear Data
        </Button>
      </Inline>
    );
  }

  if (linkedObjects.length === 0) {
    return <UnlinkedIssue onPicked={() => setAddingAnother(false)} />;
  }

  return (
    <Stack space="space.150">
      {linkedObjects.map((obj, i) => (
        <Box key={`${obj.type}-${obj.id}-${i}`}>
          <LinkedObjectInfo
            linkedObject={obj}
            onRemove={() => removeLinkedObjectAt(i)}
          />
        </Box>
      ))}
      {addingAnother ? (
        <Box>
          <UnlinkedIssue
            onPicked={() => setAddingAnother(false)}
            onCancel={() => setAddingAnother(false)}
          />
        </Box>
      ) : (
        <Inline>
          <Button
            appearance="default"
            spacing="compact"
            onClick={() => setAddingAnother(true)}
          >
            Add another link
          </Button>
        </Inline>
      )}
    </Stack>
  );
}
