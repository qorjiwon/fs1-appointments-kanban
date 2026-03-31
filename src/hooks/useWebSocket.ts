import { useState, useEffect, useRef, useCallback } from 'react';
import type { Appointment } from '../types';

type WSStatus = 'connecting' | 'connected' | 'disconnected';

interface UseWebSocketReturn {
  status: WSStatus;
}

interface WSMessage {
  type: 'appointment_created' | 'appointment_updated';
  appointment: Appointment;
}

export function useWebSocket(onEvent: (type: string, appointment: Appointment) => void): UseWebSocketReturn {
  const [status, setStatus] = useState<WSStatus>('connecting');
  const wsRef = useRef<WebSocket | null>(null);
  const retriesRef = useRef(0);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const connect = useCallback(() => {
    const base = import.meta.env.VITE_WS_URL as string | undefined;
    const wsUrl = base || 'ws://localhost:4001';

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      setStatus('connecting');

      ws.onopen = () => {
        setStatus('connected');
        retriesRef.current = 0;
        // API Gateway WebSocket용 기본 subscribe 메시지 (필요 시 라우트에 맞게 조정)
        ws.send(JSON.stringify({ action: 'subscribeAppointments' }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as WSMessage;
          if (msg && msg.type && msg.appointment) {
            onEventRef.current(msg.type, msg.appointment);
          }
        } catch {
          // ignore malformed messages
        }
      };

      ws.onerror = () => {
        setStatus('disconnected');
      };

      ws.onclose = () => {
        wsRef.current = null;
        if (retriesRef.current < 3) {
          const delay = Math.pow(2, retriesRef.current) * 1000;
          retriesRef.current += 1;
          setStatus('connecting');
          setTimeout(connect, delay);
        } else {
          setStatus('disconnected');
        }
      };
    } catch {
      setStatus('disconnected');
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
    };
  }, [connect]);

  return { status };
}

