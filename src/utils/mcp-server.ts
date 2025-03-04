import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { z } from "zod";
import type { MCPServer, MCPServerConfig } from "../types";

// Validation schemas
const MCPServerSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Server name is required"),
  command: z.string().min(1, "Command is required"),
  args: z.array(z.string()),
  metadata: z.record(z.string()).optional(),
});

// File path
const configFilePath = path.join(
  os.homedir(),
  "Library",
  "Application Support",
  "Claude",
  "claude_desktop_config.json",
);

/**
 * Reads the MCP server configuration file
 */
export async function readConfigFile(): Promise<MCPServerConfig> {
  try {
    await fs.access(configFilePath);
    const data = await fs.readFile(configFilePath, "utf-8");
    return JSON.parse(data) as MCPServerConfig;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      // File doesn't exist, create default
      const defaultConfig: MCPServerConfig = { mcpServers: {} };
      await fs.mkdir(path.dirname(configFilePath), { recursive: true });
      await fs.writeFile(configFilePath, JSON.stringify(defaultConfig, null, 2));
      return defaultConfig;
    }
    throw error;
  }
}

/**
 * Writes the MCP server configuration to the file
 */
export async function writeConfigFile(config: MCPServerConfig): Promise<void> {
  await fs.mkdir(path.dirname(configFilePath), { recursive: true });
  await fs.writeFile(configFilePath, JSON.stringify(config, null, 2));
}

/**
 * Converts raw config to MCPServer objects
 */
export function configToServers(config: MCPServerConfig): MCPServer[] {
  return Object.entries(config.mcpServers).map(([name, details]) => ({
    id: name,
    name,
    command: details.command,
    args: details.args,
  }));
}

/**
 * Gets all MCP servers
 */
export async function getServers(): Promise<MCPServer[]> {
  const config = await readConfigFile();
  return configToServers(config);
}

/**
 * Adds a new MCP server
 */
export async function addServer(server: Omit<MCPServer, "id">): Promise<MCPServer> {
  // Validate server data
  const serverWithId = {
    ...server,
    id: server.name.toLowerCase().replace(/[^a-z0-9]/g, "-"),
  };

  MCPServerSchema.parse(serverWithId);

  // Add to config file
  const config = await readConfigFile();

  if (config.mcpServers[serverWithId.id]) {
    throw new Error(`Server with name "${server.name}" already exists`);
  }

  config.mcpServers[serverWithId.id] = {
    command: server.command,
    args: server.args,
  };

  await writeConfigFile(config);
  return serverWithId;
}

/**
 * Updates an existing MCP server
 */
export async function updateServer(server: MCPServer): Promise<MCPServer> {
  // Validate server data
  MCPServerSchema.parse(server);

  // Update in config file
  const config = await readConfigFile();

  if (!config.mcpServers[server.id]) {
    throw new Error(`Server "${server.name}" does not exist`);
  }

  // If the name changed, we need to create a new entry and delete the old one
  if (server.id !== server.name.toLowerCase().replace(/[^a-z0-9]/g, "-")) {
    const newId = server.name.toLowerCase().replace(/[^a-z0-9]/g, "-");

    if (config.mcpServers[newId]) {
      throw new Error(`Server with name "${server.name}" already exists`);
    }

    // Copy to new ID
    config.mcpServers[newId] = {
      command: server.command,
      args: server.args,
    };

    // Delete old ID
    delete config.mcpServers[server.id];

    // Update server ID and return
    const updatedServer = { ...server, id: newId };
    await writeConfigFile(config);
    return updatedServer;
  }

  // Update existing entry
  config.mcpServers[server.id] = {
    command: server.command,
    args: server.args,
  };

  await writeConfigFile(config);
  return server;
}

/**
 * Deletes an MCP server
 */
export async function deleteServer(serverId: string): Promise<void> {
  const config = await readConfigFile();

  if (!config.mcpServers[serverId]) {
    throw new Error("Server does not exist");
  }

  delete config.mcpServers[serverId];
  await writeConfigFile(config);
}
