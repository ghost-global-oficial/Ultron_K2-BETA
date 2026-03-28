/**
 * ULTRON PC Bridge Client
 * Conecta ao bridge WebSocket (ws://localhost:3002) e expõe executeAction().
 * Reconecta automaticamente se a ligação cair.
 */

const BRIDGE_URL = 'ws://localhost:3002';
const RECONNECT_DELAY = 2000;

type PendingCall = { resolve: (v: any) => void; reject: (e: any) => void };

class BridgeClient {
  private ws: WebSocket | null = null;
  private pending = new Map<string, PendingCall>();
  private _ready = false;
  private _connecting = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  get isReady() { return this._ready; }

  connect(): Promise<void> {
    if (this._ready || this._connecting) return Promise.resolve();
    this._connecting = true;

    return new Promise((resolve) => {
      try {
        this.ws = new WebSocket(BRIDGE_URL);

        this.ws.onopen = () => {
          console.log('[BridgeClient] Connected to ULTRON PC Bridge');
          this._connecting = false;
        };

        this.ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data);
            if (msg.type === 'ready') {
              this._ready = true;
              console.log('[BridgeClient] Bridge ready (pid:', msg.pid, ')');
              resolve();
              return;
            }
            // Resolver chamada pendente pelo id
            if (msg.id && this.pending.has(msg.id)) {
              const { resolve: res, reject: rej } = this.pending.get(msg.id)!;
              this.pending.delete(msg.id);
              if (msg.success === false) rej(new Error(msg.error ?? 'Bridge error'));
              else res(msg);
            }
          } catch { /* ignore parse errors */ }
        };

        this.ws.onclose = () => {
          this._ready = false;
          this._connecting = false;
          console.log('[BridgeClient] Disconnected — reconnecting in', RECONNECT_DELAY, 'ms');
          this.scheduleReconnect();
        };

        this.ws.onerror = () => {
          this._ready = false;
          this._connecting = false;
          // Não logar erro aqui — onclose vai disparar a seguir
          resolve(); // não bloquear — bridge pode não estar disponível
        };
      } catch (e) {
        this._connecting = false;
        resolve();
      }
    });
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, RECONNECT_DELAY);
  }

  async executeAction(action: any): Promise<{ success: boolean; error?: string; durationMs?: number }> {
    if (!this._ready || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Bridge not connected');
    }
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws!.send(JSON.stringify({ id, action }));
      // Timeout de 10s por ação
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error('Bridge action timeout'));
        }
      }, 10000);
    });
  }
}

// Singleton exportado
export const bridgeClient = new BridgeClient();
