import { Appointment, AppointmentsResponse, AppointmentStatus } from '../types';

const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

function buildUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${normalizedPath}`;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(buildUrl(path), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const error = new Error(body.error || `HTTP ${res.status}`) as Error & {
      status: number;
      body: unknown;
    };
    error.status = res.status;
    error.body = body;
    throw error;
  }

  return res.json();
}

export interface CreateAppointmentInput {
  patient_name: string;
  clinic_id: string;
  datetime: string;
  treatment_type: string;
}

export const api = {
  createAppointment(input: CreateAppointmentInput): Promise<Appointment> {
    return request('/appointments', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  listAppointments(params?: {
    status?: AppointmentStatus[];
    from?: string;
    to?: string;
    q?: string;
    page?: number;
    limit?: number;
  }): Promise<AppointmentsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.status) {
      params.status.forEach((s) => searchParams.append('status', s));
    }
    if (params?.from) searchParams.set('from', params.from);
    if (params?.to) searchParams.set('to', params.to);
    if (params?.q) searchParams.set('q', params.q);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));

    const qs = searchParams.toString();
    return request(`/appointments${qs ? '?' + qs : ''}`);
  },

  getAppointment(id: string): Promise<Appointment> {
    return request(`/appointments/${id}`);
  },

  transitionAppointment(
    id: string,
    targetStatus: AppointmentStatus,
    changedBy: string = 'admin'
  ): Promise<Appointment> {
    return request(`/appointments/${id}/transition`, {
      method: 'PATCH',
      body: JSON.stringify({ target_status: targetStatus, changed_by: changedBy }),
    });
  },
};
