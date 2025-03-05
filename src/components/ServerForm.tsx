import { Action, ActionPanel, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";
import type { MCPServer } from "../types";
import { addServer, updateServer } from "../utils/mcp-server";

interface ServerFormProps {
  server?: MCPServer;
  onServerAdded?: () => Promise<void> | void;
}

export default function ServerForm({ server, onServerAdded }: ServerFormProps) {
  const { pop } = useNavigation();
  const [nameError, setNameError] = useState<string | undefined>();
  const [commandError, setCommandError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formValues, setFormValues] = useState<{
    name: string;
    command: string;
    args: string;
    envVars: string;
  }>({
    name: server?.name || "",
    command: server?.command || "",
    args: server?.args.join("\n") || "",
    envVars: server?.env ? Object.entries(server.env).map(([key, value]) => `${key}=${value}`).join("\n") : "",
  });

  function handleNameChange(value: string) {
    setFormValues((prev) => ({ ...prev, name: value }));
    setNameError(undefined);
  }

  function handleCommandChange(value: string) {
    setFormValues((prev) => ({ ...prev, command: value }));
    setCommandError(undefined);
  }

  function handleArgsChange(value: string) {
    setFormValues((prev) => ({ ...prev, args: value }));
  }

  function handleEnvVarsChange(value: string) {
    setFormValues((prev) => ({ ...prev, envVars: value }));
  }

  function validateForm(): boolean {
    let isValid = true;

    if (formValues.name.trim().length === 0) {
      setNameError("The name is required");
      isValid = false;
    } else {
      setNameError(undefined);
    }

    if (formValues.command.trim().length === 0) {
      setCommandError("The command is required");
      isValid = false;
    } else {
      setCommandError(undefined);
    }

    return isValid;
  }

  // Parse environment variables from multi-line string into object
  function parseEnvVars(envString: string): Record<string, string> | undefined {
    const envVars: Record<string, string> = {};
    const lines = envString.split("\n").filter(line => line.trim().length > 0);
    
    if (lines.length === 0) return undefined;
    
    for (const line of lines) {
      const parts = line.split("=");
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join("=").trim();
        if (key) {
          envVars[key] = value;
        }
      }
    }
    
    return Object.keys(envVars).length > 0 ? envVars : undefined;
  }

  async function handleSubmit() {
    if (isSubmitting) return;

    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      const argsArray = formValues.args
        .split("\n")
        .map((arg) => arg.trim())
        .filter((arg) => arg.length > 0);
      
      const envVars = parseEnvVars(formValues.envVars);

      if (server) {
        await updateServer({
          ...server,
          name: formValues.name,
          command: formValues.command,
          args: argsArray,
          env: envVars,
        });
        showToast({
          style: Toast.Style.Success,
          title: "Server Updated",
          message: `${formValues.name} has been updated`,
        });
      } else {
        await addServer({
          name: formValues.name,
          command: formValues.command,
          args: argsArray,
          env: envVars,
        });
        showToast({
          style: Toast.Style.Success,
          title: "Server Added",
          message: `${formValues.name} has been added`,
        });
      }

      if (onServerAdded) {
        await onServerAdded();
      }
      pop();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: server ? "Failed to Update Server" : "Failed to Add Server",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Server" onSubmit={handleSubmit} />
        </ActionPanel>
      }
      isLoading={isSubmitting}
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="Enter server name"
        value={formValues.name}
        onChange={handleNameChange}
        error={nameError}
      />
      <Form.TextField
        id="command"
        title="Command"
        placeholder="Enter command (e.g., npx, python, uv)"
        value={formValues.command}
        onChange={handleCommandChange}
        error={commandError}
      />
      <Form.TextArea
        id="args"
        title="Arguments"
        placeholder="Enter one argument per line"
        value={formValues.args}
        onChange={handleArgsChange}
        info="Each line represents a separate argument"
      />
      <Form.TextArea
        id="envVars"
        title="Environment Variables"
        placeholder="Enter environment variables as KEY=VALUE, one per line"
        value={formValues.envVars}
        onChange={handleEnvVarsChange}
        info="Each line should be in the format KEY=VALUE"
      />
    </Form>
  );
}
