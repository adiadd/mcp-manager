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
    // Remove immediate validation
    setNameError(undefined);
  }

  function handleCommandChange(value: string) {
    setFormValues((prev) => ({ ...prev, command: value }));
    // Remove immediate validation
    setCommandError(undefined);
  }

  function handleArgsChange(value: string) {
    setFormValues((prev) => ({ ...prev, args: value }));
  }

  // Add validation function to validate before submission
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

  async function handleSubmit(values: Form.Values) {
    if (isSubmitting) return;

    // Validate form before submitting
    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      const argsArray = (values.args as string)
        .split("\n")
        .map((arg) => arg.trim())
        .filter((arg) => arg.length > 0);

      if (server) {
        // Update existing server
        await updateServer({
          ...server,
          name: values.name as string,
          command: values.command as string,
          args: argsArray,
        });
        showToast({
          style: Toast.Style.Success,
          title: "Server Updated",
          message: `${values.name} has been updated`,
        });
        if (onServerAdded) {
          await onServerAdded();
        }
        pop();
      } else {
        // Add new server
        await addServer({
          name: values.name as string,
          command: values.command as string,
          args: argsArray,
        });
        showToast({
          style: Toast.Style.Success,
          title: "Server Added",
          message: `${values.name} has been added`,
        });
        if (onServerAdded) {
          await onServerAdded();
        }
        // Reset form for adding more servers
        setFormValues({
          name: "",
          command: "",
          args: "",
        });
      }
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

  async function handleSubmitAndBack(values: Form.Values) {
    if (isSubmitting) return;

    // Validate form before submitting
    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      const argsArray = (values.args as string)
        .split("\n")
        .map((arg) => arg.trim())
        .filter((arg) => arg.length > 0);

      if (server) {
        // Update existing server
        await updateServer({
          ...server,
          name: values.name as string,
          command: values.command as string,
          args: argsArray,
        });
        showToast({
          style: Toast.Style.Success,
          title: "Server Updated",
          message: `${values.name} has been updated`,
        });
      } else {
        // Add new server
        await addServer({
          name: values.name as string,
          command: values.command as string,
          args: argsArray,
        });
        showToast({
          style: Toast.Style.Success,
          title: "Server Added",
          message: `${values.name} has been added`,
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
      isLoading={isSubmitting}
      navigationTitle={server ? `Edit ${server.name}` : "Add New MCP Server"}
      actions={
        <ActionPanel>
          {server ? (
            <Action.SubmitForm
              title="Update Server"
              onSubmit={handleSubmit}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
            />
          ) : (
            <>
              <Action.SubmitForm
                title="Add Server"
                onSubmit={handleSubmit}
                shortcut={{ modifiers: ["cmd"], key: "s" }}
              />
              <Action.SubmitForm
                title="Add Server and Back"
                onSubmit={handleSubmitAndBack}
                shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
              />
            </>
          )}
          <Action
            title="Cancel"
            onAction={pop}
            // Removed the reserved shortcut
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="My MCP Server"
        value={formValues.name}
        onChange={handleNameChange}
        error={nameError}
        autoFocus={!server}
      />
      <Form.TextField
        id="command"
        title="Command"
        placeholder="npx"
        value={formValues.command}
        onChange={handleCommandChange}
        error={commandError}
      />
      <Form.TextArea
        id="args"
        title="Arguments"
        placeholder="-y
@modelcontextprotocol/server-filesystem
/Users/username/Desktop
/Users/username/Downloads"
        value={formValues.args}
        onChange={handleArgsChange}
        info="Each line will be treated as a separate argument"
        enableMarkdown={true}
      />
    </Form>
  );
}
