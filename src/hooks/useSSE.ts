import { useEffect, useRef, useState, useCallback } from 'react';
import { Appointment } from '../types';

type SSEStatus = 'connecting' | 'connected' | 'disconnected';

interface UseSSEReturn {
  status: SSEStatus;
  lastEvent: { type: string; appointment: Appointment } | null;
}

export function useSSE(onEvent: (type: string, appointment: Appointment) => void): UseSSEReturn {
  const [status, setStatus] = useState<SSEStatus>('connecting');
  const [lastEvent, setLastEvent] = useState<UseSSEReturn['lastEvent']>(null);
  const retriesRef = useRef(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const connect = useCallback(() => {
    const sseUrl = import.meta.env.VITE_API_URL
      ? `${import.meta.env.VITE_API_URL.replace(/\/+$/, '')}/events`
          .replace('/api/events', '/events')
          .replace(/\/appointments\/events/, '/events')
      : '/events';

    const es = new EventSource(sseUrl);
    eventSourceRef.current = es;

    es.addEventListener('connected', () => {
      setStatus('connected');
      retriesRef.current = 0;
    });

    es.addEventListener('appointment_created', (e) => {
      const appointment = JSON.parse(e.data) as Appointment;
      setLastEvent({ type: 'appointment_created', appointment });
      onEventRef.current('appointment_created', appointment);
    });

    es.addEventListener('appointment_updated', (e) => {
      const appointment = JSON.parse(e.data) as Appointment;
      setLastEvent({ type: 'appointment_updated', appointment });
      onEventRef.current('appointment_updated', appointment);
    });

    es.onerror = () => {
      es.close();
      setStatus('disconnected');

      if (retriesRef.current < 3) {
        const delay = Math.pow(2, retriesRef.current) * 1000;
        retriesRef.current++;
        setStatus('connecting');
        setTimeout(() => connect(), delay);
      }
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      eventSourceRef.current?.close();
    };
  }, [connect]);

  return { status, lastEvent };
}
