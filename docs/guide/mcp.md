# MCP (Model Context Protocol)

M.A.D. BOLT-REMIX supports the **Model Context Protocol (MCP)** — the open standard for connecting LLMs to external tools, data sources, and services. This lets your AI build agent not only write code, but also **interact with your own servers and APIs**.

## What MCP Gives You

- **Tools** — MCP servers expose callable tools (e.g., a database query tool, an internal API client).
- **Resources** — context the model can read (files, docs, configuration).
- **Prompts** — reusable prompt templates defined on the server side.

## Adding an MCP Server

1. Open **Settings → MCP**.
2. Add a server with a **name** and **transport**:
   - **SSE** (Server-Sent Events) — connect to an HTTP endpoint.
   - **stdio** — spawn a local command (desktop app only).
3. M.A.D. will connect and surface the server's tools/resources to the model.

## Config Format

The MCP configuration format is **identical to the one used in Claude Desktop**, so any existing config you have works here:

```json
{
  "mcpServers": {
    "my-server": {
      "type": "sse",
      "url": "https://example.com/mcp"
    }
  }
}
```

## Using MCP During a Build

Once connected, you can ask M.A.D. to:

- **Query a database** through a database MCP server.
- **Read internal documentation** exposed as MCP resources.
- **Trigger deployments** via a deployment MCP tool.

The model decides which tools to call based on your request — exactly like a desktop coding agent.

## Related

- [Providers](/guide/providers) — the model backends that use MCP tools.
- [Git & GitHub](/guide/git) — version-control your MCP config.
