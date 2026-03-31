import { useState, useEffect, useCallback } from 'react';
import { Appointment, AppointmentStatus } from '../types';
import { api } from '../services/api';
import { Filters } from './useFilters';

export function useAppointments(filters: Filters) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: {
        status?: AppointmentStatus[];
        from?: string;
        to?: string;
        q?: string;
        page?: number;
        limit?: number;
      } = { page: 1, limit: 200 };

      if (filters.status.length > 0) params.status = filters.status;
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      if (filters.q) params.q = filters.q;

      const result = await api.listAppointments(params);
      setAppointments(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch appointments');
    } finally {
      setLoading(false);
    }
  }, [filters.status, filters.from, filters.to, filters.q]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const handleSSEEvent = useCallback((_type: string, appointment: Appointment) => {
    setAppointments((prev) => {
      const idx = prev.findIndex((a) => a.id === appointment.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = appointment;
        return updated;
      }
      return [appointment, ...prev];
    });
  }, []);

  const updateAppointmentLocally = useCallback((updated: Appointment) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === updated.id ? updated : a))
    );
  }, []);

  return {
    appointments,
    loading,
    error,
    refetch: fetchAppointments,
    handleSSEEvent,
    updateAppointmentLocally,
  };
}
