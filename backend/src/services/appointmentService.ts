import { v4 as uuidv4 } from 'uuid';
import { Appointment, AppointmentStatus, TransitionRecord } from '../models/appointment';
import { isTransitionAllowed, getAllowedTransitions } from './stateMachine';

const appointments = new Map<string, Appointment>();

export interface CreateAppointmentInput {
  patient_name: string;
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
    datetime: input.datetime,
    treatment_type: input.treatment_type,
    status: 'requested',
    transition_history: [],
    version: 0,
    created_at: now,
    updated_at: now,
  };
  appointments.set(appointment.id, appointment);
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
  appointment.version += 1;
  appointment.updated_at = new Date().toISOString();

  return { success: true, appointment };
}
