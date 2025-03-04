import { Action, ActionPanel, Alert, Icon, List, Toast, confirmAlert, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import type { MCPServer, SortOptions } from "../types";
import { deleteServer, getServers } from "../utils/mcp-server";
import ServerDetail from "./ServerDetail";
import ServerForm from "./ServerForm";

export default function ServerList() {
  const [searchText, setSearchText] = useState("");
  const [sortOptions, setSortOptions] = useState<SortOptions>({ key: "name", direction: "asc" });

  const {
    isLoading,
    data: servers = [],
    revalidate,
  } = useCachedPromise(async () => {
    try {
      return await getServers();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load servers",
        message: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }, []);

  const filteredServers = servers.filter((server) => {
    if (!searchText) return true;
    const searchLower = searchText.toLowerCase();
    return server.name.toLowerCase().includes(searchLower) || server.command.toLowerCase().includes(searchLower);
  });

  const sortedServers = [...filteredServers].sort((a, b) => {
    const { key, direction } = sortOptions;
    const directionMultiplier = direction === "asc" ? 1 : -1;

    if (key === "name") {
      return a.name.localeCompare(b.name) * directionMultiplier;
    }

    return 0;
  });

  const handleDeleteServer = async (server: MCPServer) => {
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
        await revalidate();
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

  const setSortOrder = (key: SortOptions["key"]) => {
    setSortOptions((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search servers by name or command..."
      navigationTitle="MCP Servers"
      throttle
      actions={
        <ActionPanel>
          <Action.Push 
            title="Add Server" 
            icon={Icon.Plus} 
            target={<ServerForm onServerAdded={revalidate} />} 
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
        </ActionPanel>
      }
    >
      <List.Section title="MCP Servers" subtitle={sortedServers.length.toString()}>
        {sortedServers.map((server) => (
          <List.Item
            key={server.id}
            title={server.name}
            subtitle={server.command}
            accessories={[
              {
                tag: server.args.length ? `${server.args.length} args` : "No args",
              },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Server Management">
                  <Action.Push
                    title="View Server Details"
                    icon={Icon.Eye}
                    target={<ServerDetail server={server} onServerUpdated={async () => await revalidate()} />}
                  />

                  <Action.Push
                    title="Edit Server"
                    icon={Icon.Pencil}
                    target={<ServerForm server={server} onServerAdded={revalidate} />}
                  />

                  <Action
                    title="Delete Server"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => handleDeleteServer(server)}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section title="Add Server">
                  <Action.Push
                    title="Add New Server"
                    icon={Icon.Plus}
                    target={<ServerForm onServerAdded={revalidate} />}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section title="Sort">
                  <Action title="Sort by Name" icon={Icon.Text} onAction={() => setSortOrder("name")} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      {filteredServers.length === 0 && !isLoading && (
        <List.EmptyView
          title="No servers found"
          description={
            searchText
              ? `No servers found matching "${searchText}". Try a different search.`
              : "You don't have any MCP servers configured yet. Add your first one!"
          }
          actions={
            <ActionPanel>
              <Action.Push 
                title="Add Server" 
                icon={Icon.Plus} 
                target={<ServerForm onServerAdded={revalidate} />} 
                shortcut={{ modifiers: ["cmd"], key: "n" }}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
