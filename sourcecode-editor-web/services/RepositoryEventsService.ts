import { AuthService } from "./AuthService";
import { REPOSITORY_EVENT_WILDCARD } from "./RepositoryEventTypes";
import type { RepositoryEvent } from "./RepositoryEventTypes";

type Handler = (event: RepositoryEvent) => void;

// Singleton WebSocket client. Multiple subscribers share the same
// underlying socket — no per-subscriber connection is created.
// Events are not buffered: stores act as the source of truth and
// reconciliation happens via the periodic server sync + initial fetch.
class RepositoryEventsServiceImpl {
  //
  private socket: WebSocket | null = null;
  private connecting = false;
  private explicitlyClosed = false;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private handlers = new Map<string, Set<Handler>>();

  public on(eventType: string, handler: Handler): () => void {
    let set = this.handlers.get(eventType);
    if (!set) {
      set = new Set();
      this.handlers.set(eventType, set);
    }
    set.add(handler);
    return () => this.off(eventType, handler);
  }

  public off(eventType: string, handler: Handler): void {
    const set = this.handlers.get(eventType);
    if (set) {
      set.delete(handler);
      if (set.size === 0) {
        this.handlers.delete(eventType);
      }
    }
  }

  public async connect(): Promise<void> {
    if (typeof window === "undefined") {
      return; // SSR safety, although nuxt.config has ssr:false
    }
    if (this.socket || this.connecting) {
      return;
    }
    const token = await AuthService.getToken();
    if (!token) {
      console.debug("[RepositoryEvents] no token, skipping connect");
      return;
    }
    this.connecting = true;
    this.explicitlyClosed = false;

    const scheme = window.location.protocol === "https:" ? "wss" : "ws";
    const host = window.location.host;
    const url = `${scheme}://${host}/api/events/ws?token=${encodeURIComponent(
      token,
    )}`;

    try {
      const ws = new WebSocket(url);
      this.socket = ws;

      ws.addEventListener("open", () => {
        this.connecting = false;
        this.reconnectAttempts = 0;
        console.debug("[RepositoryEvents] connected");
      });

      ws.addEventListener("message", (msg) => this.dispatch(msg.data));

      ws.addEventListener("close", () => {
        console.debug("[RepositoryEvents] closed");
        this.socket = null;
        this.connecting = false;
        if (!this.explicitlyClosed) {
          this.scheduleReconnect();
        }
      });

      ws.addEventListener("error", (err) => {
        console.debug("[RepositoryEvents] error", err);
      });
    } catch (err) {
      console.debug("[RepositoryEvents] connect threw", err);
      this.connecting = false;
      this.scheduleReconnect();
    }
  }

  public disconnect(): void {
    this.explicitlyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      try {
        this.socket.close();
      } catch {
        /* ignore */
      }
      this.socket = null;
    }
  }

  public async reconnect(): Promise<void> {
    this.disconnect();
    await this.connect();
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }
    this.reconnectAttempts++;
    // Exponential backoff capped at 30s.
    const delay = Math.min(30_000, 500 * 2 ** (this.reconnectAttempts - 1));
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private dispatch(raw: unknown): void {
    let event: RepositoryEvent;
    try {
      event = JSON.parse(typeof raw === "string" ? raw : String(raw));
    } catch (err) {
      console.warn("[RepositoryEvents] non-JSON message", err);
      return;
    }
    const typed = this.handlers.get(event.eventType);
    if (typed) {
      for (const h of typed) {
        try {
          h(event);
        } catch (err) {
          console.error("[RepositoryEvents] handler threw", err);
        }
      }
    }
    const wildcard = this.handlers.get(REPOSITORY_EVENT_WILDCARD);
    if (wildcard) {
      for (const h of wildcard) {
        try {
          h(event);
        } catch (err) {
          console.error("[RepositoryEvents] wildcard handler threw", err);
        }
      }
    }
  }
}

export const RepositoryEventsService = new RepositoryEventsServiceImpl();
