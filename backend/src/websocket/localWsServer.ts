import { WebSocketServer, WebSocket } from 'ws';
import type { Appointment } from '../models/appointment';

const WS_PORT = Number(process.env.WS_PORT) || 4001;

let wss: WebSocketServer | null = null;

export function startLocalWebSocketServer(): void {
  if (wss) return;

  wss = new WebSocketServer({ port: WS_PORT });

  wss.on('connection', (socket) => {
    socket.on('message', () => {
      // 프론트엔드가 subscribe 등 JSON을 보내도 로컬에서는 전체 브로드캐스트만 사용
    });
    socket.on('error', () => {});
  });

  console.log(`Local WebSocket: ws://localhost:${WS_PORT}`);
}

export function broadcastAppointmentEvent(
  type: 'appointment_created' | 'appointment_updated',
  appointment: Appointment
): void {
  if (!wss) return;
  const payload = JSON.stringify({ type, appointment });
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}
