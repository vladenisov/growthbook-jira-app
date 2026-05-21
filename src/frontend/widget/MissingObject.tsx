import { Box, Button, Text } from "@forge/react";
import React from "react";

export default function MissingObject({
  objectType,
  onRemove,
}: {
  objectType: string;
  onRemove?: () => void;
}) {
  return (
    <Box>
      <Text>
        Failed to load the linked {objectType}. It may have been deleted or
        there may be an issue loading the API.
      </Text>
      {onRemove && (
        <Button
          iconBefore="unlink"
          appearance="subtle"
          onClick={onRemove}
          spacing="compact"
        >
          Remove linked {objectType}
        </Button>
      )}
    </Box>
  );
}
