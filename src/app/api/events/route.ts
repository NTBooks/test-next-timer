import { NextRequest } from "next/server";
import { addConnection, removeConnection } from "@/lib/eventBroadcaster";

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

      // when a connection is added, send the current alarms to the client after 1 second
      setTimeout(() => {
        sendEvent({
          type: "welcome",
          message: "Welcome to the event stream",
        });
      }, 1000);

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
