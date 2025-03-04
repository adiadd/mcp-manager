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
  }>({
    name: server?.name || "",
    command: server?.command || "",
    args: server?.args.join("\n") || "",
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

      if (server) {
        await updateServer({
          ...server,
          name: formValues.name,
          command: formValues.command,
          args: argsArray,
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
    </Form>
  );
}
