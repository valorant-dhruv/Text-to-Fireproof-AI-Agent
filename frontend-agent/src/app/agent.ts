'use server';

import { Anthropic } from "@anthropic-ai/sdk";
import {
  MessageParam,
  Tool,
} from "@anthropic-ai/sdk/resources/messages/messages.mjs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import readline from "readline/promises";
import dotenv from "dotenv";

let serverScriptPath = "/Users/dhruvsoni/Desktop/Text to Fireproof Client/backend-MCP_server/build/index.js"

dotenv.config();

const ANTHROPIC_API_KEY = process.env.OPEN_ROUTER_API_KEY;
if (!ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY is not set");
}

interface OpenAITool {
    type: "function";
    function: {
      name: string;
      description: string | undefined;
      parameters: {
        type: "object";
        properties: unknown | null;
        required: unknown;
      };
    };
  }

class MCPClient {
  private mcp: Client;
  private anthropic: Anthropic;
  private transport: StdioClientTransport | null = null;
  private contextwindow: MessageParam[] = [];
  private tools: OpenAITool[] = [];

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: ANTHROPIC_API_KEY,
    });
    this.mcp = new Client({ name: "text-to-fireproof-agent", version: "0.1.0" });
  }

  //This is the function to convert the tools format from Anthropic to something Open-AI would understand
  convertToolFormat(tool: any)  {
    //Creating an intermediate tool that matches the Tool type
    const intermediateTool = {
      name: tool.name,
      description: tool.description,
      input_schema: {
        type: "object",
        properties: tool.inputSchema.properties,
        required: tool.inputSchema.required
      }
    };

    const convertedTool :OpenAITool = {
      type: "function",
      function: {
        name: intermediateTool.name,
        description: intermediateTool.description,
        parameters: {
          type: "object",
          properties: intermediateTool.input_schema.properties,
          required: intermediateTool.input_schema.required,
        },
      },
    };
    return convertedTool;
  }

  //We write a function that will connect to an MCP server that is running locally
  async connectToServer(serverScriptPath: string) {
    try {
      const isJs = serverScriptPath.endsWith(".js");
      const isPy = serverScriptPath.endsWith(".py");
      if (!isJs && !isPy) {
        throw new Error("Server script must be a .js or .py file");
      }
      const command = isPy
        ? process.platform === "win32"
          ? "python"
          : "python3"
        : process.execPath;
  
     //Standard input output client transport
     //One of the two ways to connect to an MCP server
     //This is used for local development
      this.transport = new StdioClientTransport({
        command,
        args: [serverScriptPath],
      });


      this.mcp.connect(this.transport);
  
      const toolsResult = await this.mcp.listTools();

      //Before setting the tools attribute, we use a function to convert the toolsResult returned from the MCP server into a format for OpenAI

      this.tools = toolsResult.tools.map((tool) => {
        // return {
        //   name: tool.name,
        //   description: tool.description,
        //   input_schema: tool.inputSchema,
        // };
        return this.convertToolFormat(tool);
      });
      console.log(
        "Connected to server with tools:",
        this.tools.map(({ function: fn }) => fn.name)
      );
    } catch (e) {
      console.log("Failed to connect to MCP server: ", e);
      throw e;
    }
  }

  //Now we write a function that accepts a query from user and passes it to the LLM using anthropic object created
  //It also calls the appropritate tools if the LLM decides that a tool call is needed
  async processQuery(query: string) {
    const messages: MessageParam[] = [
      ...this.contextwindow,
      {
        role: "user",
        content: query,
      },
    ];

    if (this.contextwindow.length === 0) {
      this.contextwindow = messages;
    }
  
    // const response = await this.anthropic.messages.create({
    //   model: "claude-3-5-sonnet-20241022",
    //   max_tokens: 1000,
    //   messages,
    //   tools: this.tools,
    // });

    //Let's try using openrouter to make the same request
    const request = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPEN_ROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-001',
          tools: this.tools,
          messages: messages,
        }),
      });

    
    const data = await request.json();
    console.log('This is the response from the LLM')
    console.log(data.choices);

    const finalText = [];
    const toolResults = [];

    for (const choice of data.choices) {
        //If this is a normal response and not a tool call use
        if (!('tool_calls' in choice.message)) {
            finalText.push(choice.message.content);
        }

        //Otherwise it means this is a tool call
        else if('tool_calls' in choice.message)
        {
            console.log(choice.message.tool_calls);
            //For each tool call request, we actually call the tool
            for (const toolCall of choice.message.tool_calls) {
                const toolName = toolCall.function.name;
                const args = JSON.parse(toolCall.function.arguments);
                const result = await this.mcp.callTool({
                    name: toolName,
                    arguments: args,
                }) as { content: Array<{ type: string; text: string }> };

                console.log("The response after the tool was called",result)


                toolResults.push(result);
                finalText.push(`[Calling tool ${toolName} with args ${JSON.stringify(args)}]`);

                const new_message: MessageParam[] = [
                    {
                      role: "user",
                      content: result.content[0].text as string,
                    },
                  ];

                messages.push(...new_message);

                //Now we again make the call to the LLM
                const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                      Authorization: `Bearer ${process.env.OPEN_ROUTER_API_KEY}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      model: 'google/gemini-2.0-flash-001',
                      messages:new_message,
                    //   tools: this.tools,
                    }),
                  });
                const data = await response.json();
                console.log("This is the data after tool call and second LLM call", data);
                finalText.push(data.choices[0]?.message?.content || "No response from LLM");

            }
        }
  
    // for (const content of response.content) {
    //   if (content.type === "text") {
    //     finalText.push(content.text);
    //   } else if (content.type === "tool_use") {
    //     const toolName = content.name;
    //     const toolArgs = content.input as { [x: string]: unknown } | undefined;
  
    //     const result = await this.mcp.callTool({
    //       name: toolName,
    //       arguments: toolArgs,
    //     });
    //     toolResults.push(result);
    //     finalText.push(
    //       `[Calling tool ${toolName} with args ${JSON.stringify(toolArgs)}]`
    //     );
  
    //     messages.push({
    //       role: "user",
    //       content: result.content as string,
    //     });
  
    //     const response = await this.anthropic.messages.create({
    //       model: "claude-3-5-sonnet-20241022",
    //       max_tokens: 1000,
    //       messages,
    //     });
  
    //     finalText.push(
    //       response.content[0].type === "text" ? response.content[0].text : ""
    //     );
    //   }
    // }
        }

        return finalText.join("\n");
    }

  async usermessage(message: string) {
    const response = await this.processQuery(message);
    console.log("\n" + response);
    return response;
  }
  
  async cleanup() {
    await this.mcp.close();
  }

}

async function main(messages: string) {
    console.log(messages);
    let response : string | undefined;
   
    const mcpClient = new MCPClient();
    try {
      await mcpClient.connectToServer(serverScriptPath);
      response = await mcpClient.usermessage(messages);
    } finally {
      await mcpClient.cleanup();
    }
    return response;
  }
  
export default main;