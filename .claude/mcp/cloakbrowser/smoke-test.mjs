import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "node",
  args: ["server.mjs"],
  cwd: import.meta.dirname
});

const client = new Client({ name: "cloakbrowser-smoke-test", version: "0.1.0" });
await client.connect(transport);
const tools = await client.listTools();
if (!tools.tools.some(tool => tool.name === "cloakbrowser_read_url")) {
  throw new Error("cloakbrowser_read_url is not registered");
}
await client.close();
console.log("mcp smoke ok");
