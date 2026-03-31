import React from 'react';
import { Appointment, STATUS_COLORS, ALLOWED_TRANSITIONS } from '../types';

interface AppointmentCardProps {
  appointment: Appointment;
  onClick: (appointment: Appointment) => void;
}

export function AppointmentCard({ appointment, onClick }: AppointmentCardProps) {
  const time = new Date(appointment.datetime).toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const allowed = ALLOWED_TRANSITIONS[appointment.status];
  const nextStep = allowed.find((s) => s !== 'cancelled');

  return (
    <div
      className="appointment-card"
      onClick={() => onClick(appointment)}
      style={{ '--card-accent': STATUS_COLORS[appointment.status] } as React.CSSProperties}
    >
      <div className="card-top">
        <span className="patient-name">{appointment.patient_name}</span>
        <span className="card-status-dot" style={{ background: STATUS_COLORS[appointment.status] }} />
      </div>
      <div className="card-body">
        <div className="card-info">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v6l4 2"/>
          </svg>
          <span>{time}</span>
        </div>
        <div className="card-info">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
          </svg>
          <span>{appointment.treatment_type}</span>
        </div>
      </div>
    </div>
  );
}
