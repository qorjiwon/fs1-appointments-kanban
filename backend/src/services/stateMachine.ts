import { AppointmentStatus } from '../models/appointment';

const TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  requested: ['confirmed', 'cancelled'],
  confirmed: ['checked_in', 'cancelled'],
  checked_in: ['in_treatment'],
  in_treatment: ['completed'],
  completed: [],
  cancelled: [],
};

export function getAllowedTransitions(currentStatus: AppointmentStatus): AppointmentStatus[] {
  return TRANSITIONS[currentStatus] || [];
}

export function isTransitionAllowed(
  currentStatus: AppointmentStatus,
  targetStatus: AppointmentStatus
): boolean {
  return TRANSITIONS[currentStatus]?.includes(targetStatus) ?? false;
}
