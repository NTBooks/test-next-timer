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

export const addConnection = (connection: {
  controller: ReadableStreamDefaultController;
  sendEvent: (data: unknown) => void;
}) => {
  activeConnections.add(connection);
};

export const removeConnection = (connection: {
  controller: ReadableStreamDefaultController;
  sendEvent: (data: unknown) => void;
}) => {
  activeConnections.delete(connection);
};
