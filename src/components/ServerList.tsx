import { Action, ActionPanel, Icon, List, Toast, confirmAlert, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import type { MCPServer, SortOptions } from "../types";
import { checkServerStatus, deleteServer, getServers, restartServer, startServer, stopServer } from "../utils/mcp-server";
import ServerDetail from "./ServerDetail";
import ServerForm from "./ServerForm";

export default function ServerList() {
  const [searchText, setSearchText] = useState("");
  const [sortOptions, setSortOptions] = useState<SortOptions>({ key: "name", direction: "asc" });
  
  const { isLoading, data: servers = [], revalidate } = useCachedPromise(
    async () => {
      try {
        const serverList = await getServers();
        
        // Check status for each server
        const serversWithStatus = await Promise.all(
          serverList.map(async (server: MCPServer) => ({
            ...server,
            status: await checkServerStatus(server),
          }))
        );
        
        return serversWithStatus;
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load servers",
          message: error instanceof Error ? error.message : String(error),
        });
        return [];
      }
    },
    []
  );
  
  // Filter servers based on search text
  const filteredServers = servers.filter((server) => {
    if (!searchText) return true;
    const searchLower = searchText.toLowerCase();
    return (
      server.name.toLowerCase().includes(searchLower) ||
      server.command.toLowerCase().includes(searchLower)
    );
  });
  
  // Sort servers based on sort options
  const sortedServers = [...filteredServers].sort((a, b) => {
    const { key, direction } = sortOptions;
    const directionMultiplier = direction === "asc" ? 1 : -1;
    
    if (key === "name") {
      return a.name.localeCompare(b.name) * directionMultiplier;
    }
    
    if (key === "status") {
      if (a.status === b.status) return 0;
      return (a.status === "online" ? -1 : 1) * directionMultiplier;
    }
    
    if (key === "lastConnectionTime") {
      if (!a.lastConnectionTime && !b.lastConnectionTime) return 0;
      if (!a.lastConnectionTime) return 1 * directionMultiplier;
      if (!b.lastConnectionTime) return -1 * directionMultiplier;
      return (new Date(b.lastConnectionTime).getTime() - new Date(a.lastConnectionTime).getTime()) * directionMultiplier;
    }
    
    return 0;
  });
  
  // Handle server actions with error handling
  const handleServerAction = async (action: (server: MCPServer) => Promise<void>, server: MCPServer, actionName: string) => {
    try {
      await action(server);
      await revalidate();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: `Failed to ${actionName}`,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };
  
  const handleDeleteServer = async (server: MCPServer) => {
    try {
      // Show confirmation dialog
      const confirmed = await confirmAlert({
        title: "Delete Server",
        message: `Are you sure you want to delete "${server.name}"?`,
        primaryAction: {
          title: "Delete",
        },
        dismissAction: {
          title: "Cancel"
        },
        icon: Icon.Trash
      });
      
      if (!confirmed) {
        return; // User cancelled the deletion
      }
      
      await deleteServer(server.id);
      await revalidate();
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
  
  const setSortOrder = (key: SortOptions["key"]) => {
    if (sortOptions.key === key) {
      // Toggle direction if same key
      setSortOptions({
        key,
        direction: sortOptions.direction === "asc" ? "desc" : "asc",
      });
    } else {
      // Default to ascending for new key
      setSortOptions({
        key,
        direction: "asc",
      });
    }
  };
  
  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search servers by name or command..."
      navigationTitle="MCP Servers"
      actions={
        <ActionPanel>
          <Action.Push
            title="Add New Server" 
            icon={Icon.Plus} 
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            target={<ServerForm onServerAdded={revalidate} />}
          />
          <ActionPanel.Section title="Sort">
            <Action
              title="Sort by Name"
              icon={Icon.Text}
              shortcut={{ modifiers: ["cmd"], key: "1" }}
              onAction={() => setSortOrder("name")}
            />
            <Action
              title="Sort by Status"
              icon={Icon.Circle}
              shortcut={{ modifiers: ["cmd"], key: "2" }}
              onAction={() => setSortOrder("status")}
            />
            <Action
              title="Sort by Last Connection"
              icon={Icon.Clock}
              shortcut={{ modifiers: ["cmd"], key: "3" }}
              onAction={() => setSortOrder("lastConnectionTime")}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <List.Section title="MCP Servers" subtitle={`${filteredServers.length} servers`}>
        {sortedServers.map((server) => (
          <List.Item
            key={server.id}
            title={server.name}
            subtitle={server.command}
            icon={server.status === "online" ? Icon.CircleFilled : Icon.Circle}
            accessories={[
              { text: server.status === "online" ? "Online" : "Offline", icon: server.status === "online" ? Icon.CheckCircle : Icon.XmarkCircle },
              ...(server.lastConnectionTime ? [{ date: new Date(server.lastConnectionTime) }] : []),
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Details" 
                  icon={Icon.Sidebar} 
                  target={<ServerDetail server={server} onServerUpdated={async () => revalidate()} />}
                />
                <Action.Push
                  title="Add New Server" 
                  icon={Icon.Plus} 
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  target={<ServerForm onServerAdded={revalidate} />}
                />
                <ActionPanel.Section title="Server Actions">
                  {server.status === "offline" ? (
                    <Action
                      title="Start Server"
                      icon={Icon.Play}
                      shortcut={{ modifiers: ["cmd"], key: "s" }}
                      onAction={() => handleServerAction(startServer, server, "start")}
                    />
                  ) : (
                    <Action
                      title="Stop Server"
                      icon={Icon.Stop}
                      shortcut={{ modifiers: ["cmd"], key: "s" }}
                      onAction={() => handleServerAction(stopServer, server, "stop")}
                    />
                  )}
                  <Action
                    title="Restart Server"
                    icon={Icon.RotateClockwise}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                    onAction={() => handleServerAction(restartServer, server, "restart")}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Edit Actions">
                  <Action.Push
                    title="Edit Server" 
                    icon={Icon.Pencil} 
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                    target={<ServerForm server={server} onServerAdded={revalidate} />}
                  />
                  <Action
                    title="Delete Server"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                    onAction={() => handleDeleteServer(server)}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
} 