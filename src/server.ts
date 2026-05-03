import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools } from "./tools/review-changes.js";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "review-bridge",
    version: "1.0.0",
  });

  registerTools(server);
  return server;
}
