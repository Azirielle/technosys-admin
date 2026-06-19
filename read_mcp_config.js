const fs = require('fs');
const path = require('path');

try {
  const mcpConfigPath = 'C:/Users/ANDREW/.gemini/antigravity/mcp_config.json';
  if (fs.existsSync(mcpConfigPath)) {
    const data = fs.readFileSync(mcpConfigPath, 'utf8');
    console.log("MCP Config Contents:\n", data);
  } else {
    console.log("mcp_config.json does not exist at:", mcpConfigPath);
  }
} catch (e) {
  console.error("Failed to read mcp_config.json:", e.message);
}
