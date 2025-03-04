export interface MCPServer {
  id: string;
  name: string;
  command: string;
  args: string[];
  status?: "online" | "offline";
  lastConnectionTime?: string;
  metadata?: Record<string, string>;
}

export interface MCPServerConfig {
  mcpServers: Record<
    string,
    {
      command: string;
      args: string[];
    }
  >;
}

export type SortKey = "name" | "status" | "lastConnectionTime";
export type SortDirection = "asc" | "desc";

export interface SortOptions {
  key: SortKey;
  direction: SortDirection;
}
