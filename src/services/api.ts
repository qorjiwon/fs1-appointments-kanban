import { Appointment, AppointmentsResponse, AppointmentStatus } from '../types';

const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');
export const API_ERROR_EVENT = 'api:error';

interface RequestOptions extends RequestInit {
  suppressErrorToast?: boolean;
}

function buildUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${normalizedPath}`;
}

function emitApiError(message: string, suppressErrorToast?: boolean) {
  if (suppressErrorToast || typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(API_ERROR_EVENT, {
      detail: { message },
    })
  );
}

async function request<T>(path: string, options?: RequestOptions): Promise<T> {
  try {
    const res = await fetch(buildUrl(path), {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const message = body.error || `HTTP ${res.status}`;
      emitApiError(message, options?.suppressErrorToast);

      const error = new Error(message) as Error & {
        status: number;
        body: unknown;
      };
      error.status = res.status;
      error.body = body;
      throw error;
    }

    return res.json();
  } catch (err) {
    const error = err instanceof Error ? err : new Error('네트워크 요청에 실패했습니다');
    if (!(err instanceof Error && 'status' in err)) {
      emitApiError(error.message, options?.suppressErrorToast);
    }
    throw error;
  }
}

export interface CreateAppointmentInput {
  patient_name: string;
  datetime: string;
  treatment_type: string;
}

export const api = {
  createAppointment(input: CreateAppointmentInput): Promise<Appointment> {
    return request('/appointments', {
      method: 'POST',
      body: JSON.stringify(input),
      suppressErrorToast: true,
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
      suppressErrorToast: true,
    });
  },
};
