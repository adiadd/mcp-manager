import { Toast, showToast } from "@raycast/api";
import { exec } from "node:child_process";
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
  status: z.enum(["online", "offline"]).optional(),
  lastConnectionTime: z.string().optional(),
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
    status: "offline",
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
export async function addServer(server: Omit<MCPServer, "id" | "status" | "lastConnectionTime">): Promise<MCPServer> {
  // Validate server data
  const serverWithId = {
    ...server,
    id: server.name.toLowerCase().replace(/[^a-z0-9]/g, "-"),
    status: "offline" as const,
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
    throw new Error(`Server "${server.id}" not found`);
  }

  // If the name changed, we need to update the ID as well
  if (server.name.toLowerCase().replace(/[^a-z0-9]/g, "-") !== server.id) {
    // Remove the old entry
    delete config.mcpServers[server.id];
    // Add with new ID
    const newId = server.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
    config.mcpServers[newId] = {
      command: server.command,
      args: server.args,
    };
    server.id = newId;
  } else {
    // Update existing entry
    config.mcpServers[server.id] = {
      command: server.command,
      args: server.args,
    };
  }

  await writeConfigFile(config);

  return server;
}

/**
 * Deletes an MCP server
 */
export async function deleteServer(serverId: string): Promise<void> {
  const config = await readConfigFile();

  if (!config.mcpServers[serverId]) {
    throw new Error(`Server "${serverId}" not found`);
  }

  delete config.mcpServers[serverId];
  await writeConfigFile(config);
}

/**
 * Checks if a server is online by attempting to execute its command
 */
export async function checkServerStatus(server: MCPServer): Promise<"online" | "offline"> {
  try {
    return new Promise<"online" | "offline">((resolve) => {
      const escapeForGrep = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      const commandBase = server.command.split("/").pop() || server.command;
      const commandEscaped = escapeForGrep(server.command);
      const commandBaseEscaped = escapeForGrep(commandBase);

      const patterns = [
        `${escapeForGrep(server.command)} ${server.args.map(escapeForGrep).join(" ")}`,
        commandEscaped,
        commandBaseEscaped,
      ];

      const checkWithPattern = (index: number) => {
        if (index >= patterns.length) {
          checkPort();
          return;
        }

        const pattern = patterns[index];
        const cmd = `ps aux | grep "${pattern}" | grep -v grep`;

        exec(cmd, (error, stdout) => {
          if (!error && stdout.trim()) {
            resolve("online");
          } else {
            checkWithPattern(index + 1);
          }
        });
      };

      const checkPort = () => {
        let port: string | undefined;

        for (const arg of server.args) {
          if (/^\d+$/.test(arg)) {
            port = arg;
            break;
          }

          const portMatch = arg.match(/--port[=\s](\d+)/);
          if (portMatch) {
            port = portMatch[1];
            break;
          }

          if (arg === "-p" || arg === "--port") {
            const nextIndex = server.args.indexOf(arg) + 1;
            if (nextIndex < server.args.length && /^\d+$/.test(server.args[nextIndex])) {
              port = server.args[nextIndex];
              break;
            }
          }
        }

        if (port) {
          exec(`lsof -i :${port}`, (error, stdout) => {
            if (!error && stdout.trim()) {
              resolve("online");
            } else {
              resolve("offline");
            }
          });
        } else {
          resolve("offline");
        }
      };

      checkWithPattern(0);
    });
  } catch (error) {
    return "offline";
  }
}

/**
 * Starts an MCP server
 */
export async function startServer(server: MCPServer): Promise<void> {
  try {
    // Start the server process in the background
    const command = `${server.command} ${server.args.join(" ")} &`;
    exec(command);

    // Wait a bit for the server to start
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Check if the server is actually running
    const status = await checkServerStatus(server);

    // Update last connection time only if the server actually started
    if (status === "online") {
      const updatedServer = {
        ...server,
        status: "online" as const,
        lastConnectionTime: new Date().toISOString(),
      };

      await updateServer(updatedServer);

      await showToast({
        style: Toast.Style.Success,
        title: "Server Started",
        message: `${server.name} is now running`,
      });
    } else {
      // If the server didn't start, show a warning
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Verify Server",
        message: `${server.name} may not have started properly`,
      });
      throw new Error(`Failed to verify ${server.name} is running`);
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Start Server",
      message: (error as Error).message,
    });
    throw error;
  }
}

/**
 * Stops an MCP server
 */
export async function stopServer(server: MCPServer, forceStop = false): Promise<void> {
  try {
    // In a real app, we need to properly stop the process
    // First find any processes matching this command
    const commandBase = server.command.split("/").pop() || server.command;

    if (forceStop) {
      // Use SIGKILL directly for force stop
      exec(`pkill -9 -f "${commandBase}"`);
    } else {
      // Try to kill any processes matching this command
      // First try a graceful termination (SIGTERM)
      exec(`pkill -15 -f "${commandBase}"`);

      // Wait a bit for the process to terminate
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Check if it's still running
      const status = await checkServerStatus(server);

      // If still running, try force kill (SIGKILL)
      if (status === "online") {
        exec(`pkill -9 -f "${commandBase}"`);
        // Wait a bit more
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Check again
        const finalStatus = await checkServerStatus(server);
        if (finalStatus === "online") {
          await showToast({
            style: Toast.Style.Failure,
            title: "Warning",
            message: `Could not fully terminate ${server.name}`,
          });
        }
      }
    }

    // Update server status regardless of actual status
    // This way UI shows what user intended
    const updatedServer = {
      ...server,
      status: "offline" as const,
    };

    await updateServer(updatedServer);

    await showToast({
      style: Toast.Style.Success,
      title: "Server Stopped",
      message: `${server.name} has been stopped`,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Stop Server",
      message: (error as Error).message,
    });
    throw error;
  }
}

/**
 * Restarts an MCP server
 */
export async function restartServer(server: MCPServer): Promise<void> {
  try {
    // Stop server first
    await stopServer(server);

    // Give it a moment to fully shut down
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Then start it again
    await startServer(server);

    await showToast({
      style: Toast.Style.Success,
      title: "Server Restarted",
      message: `${server.name} has been restarted`,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Restart Server",
      message: (error as Error).message,
    });
    throw error;
  }
}
