import type { Server } from "node:http";

// Chrome's preconnect sockets never send a request, so under Node close() alone never resolves.
export function closeServer(server: Server): Promise<void> {
  const closed = new Promise<void>((done) => server.close(() => done()));
  server.closeAllConnections();
  server.removeAllListeners("request");
  return closed;
}
