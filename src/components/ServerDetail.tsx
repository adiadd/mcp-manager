import { Action, ActionPanel, Alert, Detail, Icon, Toast, confirmAlert, showToast } from "@raycast/api";
import type { MCPServer } from "../types";
import { deleteServer } from "../utils/mcp-server";
import ServerForm from "./ServerForm";

interface ServerDetailProps {
  server: MCPServer;
  onServerUpdated: () => Promise<void>;
}

// Helper function to generate a stable key for an argument
const getArgKey = (arg: string) => {
  // Create a simple hash from the string to use as key
  const hash = [...arg].reduce((acc, char) => {
    return acc + char.charCodeAt(0);
  }, 0);
  return `arg-${hash}`;
};

// Helper function to mask sensitive values, showing only last 5 characters
const maskSensitiveValue = (value: string) => {
  if (!value || value.length <= 5) {
    return "*****";
  }
  return `*****${value.slice(-5)}`;
};

export default function ServerDetail({ server, onServerUpdated }: ServerDetailProps) {
  const handleDeleteServer = async () => {
    try {
      const confirmed = await confirmAlert({
        title: "Delete Server",
        message: `Are you sure you want to delete "${server.name}"?`,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      });

      if (confirmed) {
        await deleteServer(server.id);
        await onServerUpdated();
        showToast({
          style: Toast.Style.Success,
          title: "Server Deleted",
          message: `${server.name} has been deleted`,
        });
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Delete Server",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const markdown = `
# ${server.name}

## Command
\`\`\`
${server.command} ${server.args.join(" ")}
\`\`\`

## Details
- **ID**: \`${server.id}\`
- **Command**: \`${server.command}\`
- **Arguments**: ${server.args.length > 0 ? server.args.map((arg) => `\`${arg}\``).join(", ") : "None"}
${
  server.env
    ? `
## Environment Variables
${Object.entries(server.env)
  .map(([key, value]) => `- **${key}**: \`${maskSensitiveValue(value)}\``)
  .join("\n")}`
    : ""
}
${
  server.metadata
    ? `## Metadata
${Object.entries(server.metadata)
  .map(([key, value]) => `- **${key}**: ${value}`)
  .join("\n")}`
    : ""
}
`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={`${server.name} Details`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Command" text={server.command} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="Arguments">
            {server.args.map((arg) => (
              <Detail.Metadata.TagList.Item key={getArgKey(arg)} text={arg} />
            ))}
          </Detail.Metadata.TagList>
          
          {server.env && Object.keys(server.env).length > 0 && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label title="Environment Variables" />
              {Object.entries(server.env).map(([key, value]) => (
                <Detail.Metadata.Label key={key} title={key} text={maskSensitiveValue(value)} />
              ))}
            </>
          )}
          
          {server.metadata && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label title="Metadata" />
              {Object.entries(server.metadata).map(([key, value]) => (
                <Detail.Metadata.Label key={key} title={key} text={value} />
              ))}
            </>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.Push
            title="Edit Server"
            icon={Icon.Pencil}
            target={<ServerForm server={server} onServerAdded={onServerUpdated} />}
          />
          <Action
            title="Delete Server"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={handleDeleteServer}
            shortcut={{ modifiers: ["cmd"], key: "backspace" }}
          />
        </ActionPanel>
      }
    />
  );
}
