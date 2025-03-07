export interface MCPServer {
  id: string;
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  metadata?: Record<string, string>;
}

export interface MCPServerConfig {
  mcpServers: Record<
    string,
    {
      command: string;
      args: string[];
      env?: Record<string, string>;
    }
  >;
}

export type SortKey = "name";
export type SortDirection = "asc" | "desc";

export interface SortOptions {
  key: SortKey;
  direction: SortDirection;
}
