# MCP Manager

A Raycast extension for managing local Model Context Protocol (MCP) servers.

## Features

- **View MCP Servers**: List all your local MCP servers with their status (online/offline)
- **Search & Sort**: Easily find servers by name or command, and sort by name, status, or last connection time
- **CRUD Operations**: Create, read, update, and delete MCP servers with an intuitive interface

## Installation

1. Make sure you have [Raycast](https://raycast.com/) installed
2. Clone this repository
3. Navigate to the extension directory: `cd mcp-manager`
4. Install dependencies: `npm install`
5. Build the extension: `npm run build`
6. Start development mode: `npm run dev`

## Usage

1. Open Raycast and search for "MCP Manager"
2. View your list of MCP servers
3. Use the action panel to:
   - Add new servers
   - View server details
   - Edit server information
   - Delete servers

## Configuration

The extension stores server information in `~/Library/Application Support/Claude/claude_desktop_config.json` with the following structure:

typescript:

```ts
{
  "mcpServers": {
    "server-id": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/username/Desktop", "/Users/username/Downloads"]
    }
  }
}
```

or python:

```python
{
    "mcpServers": {
        "weather": {
            "command": "uv",
            "args": [
                "--directory",
                "/ABSOLUTE/PATH/TO/PARENT/FOLDER/weather",
                "run",
                "weather.py"
            ]
        }
    }
}
```

## Development

- `npm run dev`: Start development mode with hot reloading
- `npm run build`: Build the extension
- `npm run lint`: Run linter checks
- `npm run tsc`: Run TypeScript compiler

## License

MIT
