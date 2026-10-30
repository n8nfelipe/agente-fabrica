import { defineMcpClientConnection } from "eve/connections";

export default defineMcpClientConnection({
  url: "https://mcp.context7.com/mcp",
  description:
    "Context7 provides current, version-specific documentation and code examples for libraries and developer technologies.",
  ...(process.env.CONTEXT7_API_KEY
    ? { headers: { CONTEXT7_API_KEY: process.env.CONTEXT7_API_KEY } }
    : {}),
});
