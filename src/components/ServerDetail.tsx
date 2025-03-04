import { Action, ActionPanel, Color, Detail, Icon, Toast, showToast } from "@raycast/api";
import type { MCPServer } from "../types";
import { deleteServer, restartServer, startServer, stopServer } from "../utils/mcp-server";
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

export default function ServerDetail({ server, onServerUpdated }: ServerDetailProps) {
  const handleServerAction = async (action: (server: MCPServer) => Promise<void>, actionName: string) => {
    try {
      await action(server);
      await onServerUpdated();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: `Failed to ${actionName}`,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const handleDeleteServer = async () => {
    try {
      await deleteServer(server.id);
      await onServerUpdated();
      showToast({
        style: Toast.Style.Success,
        title: "Server Deleted",
        message: `${server.name} has been deleted`,
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Delete Server",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  // Create markdown content for server details
  const markdown = `
# ${server.name}

## Status
**${server.status === "online" ? "🟢 Online" : "🔴 Offline"}**
${server.lastConnectionTime ? `\nLast Connection: ${new Date(server.lastConnectionTime).toLocaleString()}` : ""}

## Command
\`\`\`
${server.command} ${server.args.join(" ")}
\`\`\`

## Details
- **ID**: \`${server.id}\`
- **Command**: \`${server.command}\`
- **Arguments**: ${server.args.length > 0 ? server.args.map(arg => `\`${arg}\``).join(", ") : "None"}

${server.metadata ? `## Metadata
${Object.entries(server.metadata).map(([key, value]) => `- **${key}**: ${value}`).join("\n")}` : ""}
`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={`${server.name} Details`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Status" text={server.status === "online" ? "Online" : "Offline"} icon={server.status === "online" ? { source: Icon.CircleFilled, tintColor: Color.Green } : { source: Icon.Circle, tintColor: Color.Red }} />
          <Detail.Metadata.Label title="Command" text={server.command} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="Arguments">
            {server.args.map((arg) => (
              <Detail.Metadata.TagList.Item key={getArgKey(arg)} text={arg} color={Color.Blue} />
            ))}
          </Detail.Metadata.TagList>
          {server.lastConnectionTime && (
            <Detail.Metadata.Label title="Last Connection" text={new Date(server.lastConnectionTime).toLocaleString()} />
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Server Actions">
            {server.status === "offline" ? (
              <Action
                title="Start Server"
                icon={Icon.Play}
                shortcut={{ modifiers: ["cmd"], key: "s" }}
                onAction={() => handleServerAction(startServer, "start")}
              />
            ) : (
              <Action
                title="Stop Server"
                icon={Icon.Stop}
                shortcut={{ modifiers: ["cmd"], key: "s" }}
                onAction={() => handleServerAction(stopServer, "stop")}
              />
            )}
            <Action
              title="Restart Server"
              icon={Icon.RotateClockwise}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              onAction={() => handleServerAction(restartServer, "restart")}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Edit Actions">
            <Action.Push
              title="Edit Server" 
              icon={Icon.Pencil} 
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              target={<ServerForm server={server} onServerAdded={onServerUpdated} />}
            />
            <Action
              title="Delete Server"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd"], key: "backspace" }}
              onAction={handleDeleteServer}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
} 