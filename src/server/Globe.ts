import type { OutgoingMessage, Position } from '../shared';

export class Globe implements DurableObject {
  private connections: Map<string, WebSocket> = new Map();
  private positions: Map<string, Position> = new Map();

  constructor(
    private ctx: DurableObjectState,
    private env: Env
  ) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    if (url.pathname.endsWith('/websocket') || url.pathname === '/') {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      
      this.ctx.acceptWebSocket(server);
      this.connections.set(server.id, server);
      
      this.broadcastExistingPositions(server);
      
      return new Response(null, { status: 101, webSocket: client });
    }
    
    return new Response('Not Found', { status: 404 });
  }

  private broadcastExistingPositions(conn: WebSocket) {
    for (const pos of this.positions.values()) {
      conn.send(JSON.stringify({ type: 'add-marker', position: pos }));
    }
  }

  private broadcast(message: string, excludeId?: string) {
    for (const [id, conn] of this.connections) {
      if (id !== excludeId && conn.readyState === WebSocket.OPEN) {
        conn.send(message);
      }
    }
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    try {
      const data = typeof message === 'string' ? message : new TextDecoder().decode(message);
      const msg = JSON.parse(data) as OutgoingMessage;
      
      if (msg.type === 'add-marker' && msg.position) {
        this.positions.set(ws.id, msg.position);
        this.broadcast(data, ws.id);
      } else if (msg.type === 'remove-marker') {
        this.positions.delete(ws.id);
        this.broadcast(data);
      }
    } catch (e) {
      console.error('Error processing message:', e);
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
    this.connections.delete(ws.id);
    this.positions.delete(ws.id);
    
    this.broadcast(JSON.stringify({ type: 'remove-marker', id: ws.id }), ws.id);
  }

  async webSocketError(ws: WebSocket, error: any) {
    console.error('WebSocket error:', error);
  }
}