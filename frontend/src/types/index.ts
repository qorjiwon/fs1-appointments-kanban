export type AppointmentStatus =
  | 'requested'
  | 'confirmed'
  | 'checked_in'
  | 'in_treatment'
  | 'completed'
  | 'cancelled';

export interface TransitionRecord {
  timestamp: string;
  from_status: AppointmentStatus;
  to_status: AppointmentStatus;
  changed_by: string;
}

export interface Appointment {
  id: string;
  appointment_id?: string;
  patient_name: string;
  datetime: string;
  treatment_type: string;
  status: AppointmentStatus;
  transition_history: TransitionRecord[];
  created_at: string;
  updated_at: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AppointmentsResponse {
  data: Appointment[];
  pagination: PaginationInfo;
}

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  requested: '접수 대기',
  confirmed: '예약 확정',
  checked_in: '내원 접수',
  in_treatment: '진료 중',
  completed: '완료',
  cancelled: '취소',
};

export const STATUS_ACTION_LABELS: Record<AppointmentStatus, string> = {
  requested: '접수 대기',
  confirmed: '예약 확정하기',
  checked_in: '내원 접수 처리',
  in_treatment: '진료 시작',
  completed: '진료 완료 처리',
  cancelled: '예약 취소',
};

export const STATUS_COLORS: Record<AppointmentStatus, string> = {
  requested: '#6366f1',
  confirmed: '#3b82f6',
  checked_in: '#f59e0b',
  in_treatment: '#ef4444',
  completed: '#10b981',
  cancelled: '#6b7280',
};

export const STATUS_BG_COLORS: Record<AppointmentStatus, string> = {
  requested: '#eef2ff',
  confirmed: '#eff6ff',
  checked_in: '#fffbeb',
  in_treatment: '#fef2f2',
  completed: '#ecfdf5',
  cancelled: '#f9fafb',
};

export const KANBAN_STATUSES: AppointmentStatus[] = [
  'requested',
  'confirmed',
  'checked_in',
  'in_treatment',
  'completed',
  'cancelled',
];

export const FLOW_STATUSES: AppointmentStatus[] = [
  'requested',
  'confirmed',
  'checked_in',
  'in_treatment',
  'completed',
];

export const ALLOWED_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  requested: ['confirmed', 'cancelled'],
  confirmed: ['checked_in', 'cancelled'],
  checked_in: ['in_treatment'],
  in_treatment: ['completed'],
  completed: [],
  cancelled: [],
};
