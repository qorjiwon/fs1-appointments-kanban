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
  patient_name: string;
  clinic_id: string;
  datetime: string;
  treatment_type: string;
  status: AppointmentStatus;
  transition_history: TransitionRecord[];
  created_at: string;
  updated_at: string;
}
