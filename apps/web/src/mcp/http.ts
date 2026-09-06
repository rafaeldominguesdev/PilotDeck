import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { db } from "../lib/db";
import { authenticateBearer } from "./auth";
import { createPilotDeckMcpServer } from "./server";
import type { McpDatabase } from "./types";

export async function handleMcpRequest(
  request: Request,
  deps?: { db: McpDatabase },
): Promise<Response> {
  const database = deps?.db ?? db();
  const auth = await authenticateBearer(
    database,
    request.headers.get("authorization"),
  );
  if (!auth.ok) {
    return Response.json(
      { error: { code: auth.code, message: auth.message } },
      { status: 401 },
    );
  }

  const server = await createPilotDeckMcpServer({ db: database, ctx: auth.ctx });
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  try {
    return await transport.handleRequest(request);
  } finally {
    await transport.close();
    await server.close();
  }
}
