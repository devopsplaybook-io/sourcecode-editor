import { FastifyInstance } from "fastify";
import * as jwt from "jsonwebtoken";
import type { WebSocket as WS } from "ws";
import { Config } from "../Config";
import { OTelLogger } from "../OTelContext";
import { EventBusSubscribe } from "./EventBus";
import { RepositoryEvent } from "./RepositoryEventTypes";

// Importing @fastify/websocket here ensures its TypeScript module-augmentation
// for `RouteShorthandOptions.websocket` and the websocket handler signature
// is loaded for this file.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as _fastifyWebsocketTypes from "@fastify/websocket";

const logger = OTelLogger().createModuleLogger("WebSocketRoutes");

// 30s heartbeat — drops zombie sockets that no longer ack pings,
// keeping memory bounded.
const HEARTBEAT_MS = 30_000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LiveSocket = WS & { isAlive?: boolean };

export class RepositoryEventsWebSocket {
  //
  private clients = new Set<LiveSocket>();
  private unsubscribe: (() => void) | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  public registerRoutes(fastify: FastifyInstance, config: Config): void {
    // Single, shared subscription to the in-process bus.
    // Every event is fan-out serialized once and sent to all open sockets.
    this.unsubscribe = EventBusSubscribe((event) => this.broadcast(event));
    this.heartbeatTimer = setInterval(() => this.heartbeat(), HEARTBEAT_MS);

    fastify.get<{ Querystring: { token?: string } }>(
      "/ws",
      { websocket: true },
      (socket, req) => {
        const token = req.query?.token;
        if (!RepositoryEventsWebSocket.isTokenValid(token, config)) {
          logger.info("WS rejected: invalid token");
          try {
            socket.close(1008, "Access Denied");
          } catch {
            /* ignore */
          }
          return;
        }
        this.addClient(socket as LiveSocket);
      },
    );

    // Best-effort cleanup if Fastify shuts down.
    fastify.addHook("onClose", async () => {
      if (this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = null;
      }
      if (this.unsubscribe) {
        this.unsubscribe();
        this.unsubscribe = null;
      }
      for (const c of this.clients) {
        try {
          c.close();
        } catch {
          /* ignore */
        }
      }
      this.clients.clear();
    });
  }

  private addClient(socket: LiveSocket): void {
    this.clients.add(socket);
    logger.info(`WS connected (total=${this.clients.size})`);

    const remove = () => {
      if (this.clients.delete(socket)) {
        logger.info(`WS disconnected (total=${this.clients.size})`);
      }
    };

    socket.on("close", remove);
    socket.on("error", (err: Error) => {
      logger.error("WS error", err);
      remove();
    });
    socket.on("pong", () => {
      socket.isAlive = true;
    });

    socket.isAlive = true;
  }

  private heartbeat(): void {
    for (const sock of this.clients) {
      if (sock.isAlive === false) {
        try {
          sock.terminate();
        } catch {
          /* ignore */
        }
        this.clients.delete(sock);
        continue;
      }
      sock.isAlive = false;
      try {
        sock.ping();
      } catch {
        /* ignore */
      }
    }
  }

  private broadcast(event: RepositoryEvent): void {
    if (this.clients.size === 0) {
      return;
    }
    const payload = JSON.stringify(event);
    for (const sock of this.clients) {
      try {
        // readyState 1 = OPEN
        if (sock.readyState === 1) {
          sock.send(payload);
        }
      } catch (err) {
        logger.error(
          "WS send failed",
          err instanceof Error ? err : new Error(String(err)),
        );
      }
    }
  }

  private static isTokenValid(
    token: string | undefined,
    config: Config,
  ): boolean {
    if (!token) {
      return false;
    }
    try {
      jwt.verify(token, config.JWT_KEY);
      return true;
    } catch {
      return false;
    }
  }
}
