import { NextRequest } from "next/server";
import { addConnection, removeConnection } from "@/lib/eventBroadcaster";

// Store active event connections
const activeConnections: Set<{
  controller: ReadableStreamDefaultController;
  sendEvent: (data: unknown) => void;
}> = new Set();

// Function to broadcast events to all connected clients
export const broadcastEvent = (eventData: { [key: string]: unknown }) => {
  for (const connection of activeConnections) {
    connection.sendEvent(eventData);
  }
};

// Update the GET function to use the shared connections
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const sendEvent = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Add this connection to active connections
      const connection = { controller, sendEvent };
      addConnection(connection);

      // Remove connection when client disconnects
      request.signal.addEventListener("abort", () => {
        removeConnection(connection);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
