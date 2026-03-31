import { v4 as uuidv4 } from 'uuid';
import { Appointment, AppointmentStatus, TransitionRecord } from '../models/appointment';
import { isTransitionAllowed, getAllowedTransitions } from './stateMachine';
import { broadcaster } from '../sse/broadcaster';

const appointments = new Map<string, Appointment>();

export interface CreateAppointmentInput {
  patient_name: string;
  clinic_id: string;
  datetime: string;
  treatment_type: string;
}

export interface ListAppointmentsQuery {
  status?: AppointmentStatus[];
  from?: string;
  to?: string;
  q?: string;
  page?: number;
  limit?: number;
}

export function createAppointment(input: CreateAppointmentInput): Appointment {
  const now = new Date().toISOString();
  const appointment: Appointment = {
    id: uuidv4(),
    patient_name: input.patient_name,
    clinic_id: input.clinic_id,
    datetime: input.datetime,
    treatment_type: input.treatment_type,
    status: 'requested',
    transition_history: [],
    created_at: now,
    updated_at: now,
  };
  appointments.set(appointment.id, appointment);
  broadcaster.broadcast('appointment_created', appointment);
  return appointment;
}

export function getAppointment(id: string): Appointment | undefined {
  return appointments.get(id);
}

export function listAppointments(query: ListAppointmentsQuery) {
  let results = Array.from(appointments.values());

  if (query.status && query.status.length > 0) {
    results = results.filter((a) => query.status!.includes(a.status));
  }

  if (query.from) {
    results = results.filter((a) => a.datetime >= query.from!);
  }
  if (query.to) {
    const toEnd = query.to.includes('T') ? query.to : query.to + 'T23:59:59';
    results = results.filter((a) => a.datetime <= toEnd);
  }

  if (query.q) {
    const search = query.q.toLowerCase();
    results = results.filter((a) => a.patient_name.toLowerCase().includes(search));
  }

  results.sort((a, b) => a.datetime.localeCompare(b.datetime));

  const page = query.page || 1;
  const limit = query.limit || 20;
  const total = results.length;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  const paginatedResults = results.slice(offset, offset + limit);

  return {
    data: paginatedResults,
    pagination: { page, limit, total, totalPages },
  };
}

export interface TransitionResult {
  success: boolean;
  appointment?: Appointment;
  error?: string;
  allowed_transitions?: AppointmentStatus[];
}

export function seedAppointments(): void {
  if (appointments.size > 0) return;

  const today = new Date();
  const ymd = (d: Date) => d.toISOString().slice(0, 10);
  const dt = (hour: number, min: number = 0) =>
    new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour, min).toISOString();

  const seeds: {
    patient_name: string;
    treatment_type: string;
    datetime: string;
    targetStatuses: AppointmentStatus[];
  }[] = [
    { patient_name: '김민수', treatment_type: '스케일링', datetime: dt(9, 0), targetStatuses: [] },
    { patient_name: '오태현', treatment_type: '크라운', datetime: dt(13, 0), targetStatuses: [] },
    { patient_name: '이서연', treatment_type: '충치 치료', datetime: dt(9, 30), targetStatuses: ['confirmed'] },
    { patient_name: '강예린', treatment_type: '미백', datetime: dt(13, 30), targetStatuses: ['confirmed'] },
    { patient_name: '박준혁', treatment_type: '임플란트 상담', datetime: dt(10, 0), targetStatuses: ['confirmed', 'checked_in'] },
    { patient_name: '윤승민', treatment_type: '신경 치료', datetime: dt(14, 0), targetStatuses: ['confirmed', 'checked_in'] },
    { patient_name: '정하은', treatment_type: '교정 상담', datetime: dt(11, 0), targetStatuses: ['confirmed', 'checked_in', 'in_treatment'] },
  ];

  for (const seed of seeds) {
    const apt = createAppointment({
      patient_name: seed.patient_name,
      clinic_id: 'clinic-1',
      datetime: seed.datetime,
      treatment_type: seed.treatment_type,
    });

    for (const target of seed.targetStatuses) {
      transitionAppointment(apt.id, target, '시스템');
    }
  }

  console.log(`Seeded ${seeds.length} appointments`);
}

export function transitionAppointment(
  id: string,
  targetStatus: AppointmentStatus,
  changedBy: string = 'admin'
): TransitionResult {
  const appointment = appointments.get(id);
  if (!appointment) {
    return { success: false, error: 'Appointment not found' };
  }

  const allowed = getAllowedTransitions(appointment.status);
  if (!isTransitionAllowed(appointment.status, targetStatus)) {
    return {
      success: false,
      error: `Cannot transition from '${appointment.status}' to '${targetStatus}'`,
      allowed_transitions: allowed,
    };
  }

  const record: TransitionRecord = {
    timestamp: new Date().toISOString(),
    from_status: appointment.status,
    to_status: targetStatus,
    changed_by: changedBy,
  };

  appointment.status = targetStatus;
  appointment.transition_history.push(record);
  appointment.updated_at = new Date().toISOString();

  broadcaster.broadcast('appointment_updated', appointment);
  return { success: true, appointment };
}
