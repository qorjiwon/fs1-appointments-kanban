import { Response } from 'express';

interface SSEClient {
  id: string;
  res: Response;
}

class SSEBroadcaster {
  private clients: SSEClient[] = [];

  addClient(id: string, res: Response): void {
    this.clients.push({ id, res });
    res.on('close', () => {
      this.clients = this.clients.filter((c) => c.id !== id);
    });
  }

  broadcast(event: string, data: unknown): void {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    this.clients.forEach((client) => {
      client.res.write(payload);
    });
  }

  getClientCount(): number {
    return this.clients.length;
  }
}

export const broadcaster = new SSEBroadcaster();
