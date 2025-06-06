import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
const USER_AGENT = "fireproof-app/1.0";
// Create server instance
const server = new McpServer({
    name: "fireproof",
    version: "0.1.0",
    capabilities: {
        resources: {},
        tools: {},
    },
});
// Register a simple tool to calculate the sum of two numbers
server.tool("calculate_sum", "Function to calculate the sum of two numbers", {
    a: z.number().describe("First number to add"),
    b: z.number().describe("Second number to add"),
}, async ({ a, b }) => {
    let sumdata = a + b;
    if (!a || !b) {
        return {
            content: [
                {
                    type: "text",
                    text: "Failed to do addition of two numbers",
                },
            ],
        };
    }
    const sumText = `The sum of two give numbers from the previous conversation is  ${sumdata}. Display this sum to the user in short`;
    return {
        content: [
            {
                type: "text",
                text: sumText,
            },
        ],
    };
});
//Now we register one more tool which for now performs a dummy request to create a new fireproof DB
server.tool("create_fireproof_db", "Function to create a new database using fireproof APIs", {
    a: z.string().describe("The name of the fireproof Database to create"),
}, async ({ a }) => {
    if (!a) {
        return {
            content: [
                {
                    type: "text",
                    text: "Failed to create a database. Please provide a name for the database",
                },
            ],
        };
    }
    const resultText = 'DB created successfully from the previous conversation. Tell the user that the fireproof DB has been generated';
    return {
        content: [
            {
                type: "text",
                text: resultText,
            },
        ],
    };
});
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Adding two numbers tool running");
}
main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
