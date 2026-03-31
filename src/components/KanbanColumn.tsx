import React from 'react';
import { Appointment, AppointmentStatus, STATUS_LABELS, STATUS_COLORS, STATUS_BG_COLORS } from '../types';
import { AppointmentCard } from './AppointmentCard';

interface KanbanColumnProps {
  status: AppointmentStatus;
  appointments: Appointment[];
  onCardClick: (appointment: Appointment) => void;
}

const STATUS_ICONS: Record<AppointmentStatus, React.ReactNode> = {
  requested: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  confirmed: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  checked_in: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
      <polyline points="10 17 15 12 10 7"/>
    </svg>
  ),
  in_treatment: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
    </svg>
  ),
  completed: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  cancelled: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
    </svg>
  ),
};

export function KanbanColumn({ status, appointments, onCardClick }: KanbanColumnProps) {
  return (
    <div className="kanban-column" style={{ '--column-color': STATUS_COLORS[status], '--column-bg': STATUS_BG_COLORS[status] } as React.CSSProperties}>
      <div className="column-header">
        <div className="column-title-group">
          <span className="column-icon">{STATUS_ICONS[status]}</span>
          <span className="column-title">{STATUS_LABELS[status]}</span>
        </div>
        <span className="column-count">{appointments.length}</span>
      </div>
      <div className="column-body">
        {appointments.length === 0 ? (
          <div className="column-empty">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/>
            </svg>
            <span>해당 예약 없음</span>
          </div>
        ) : (
          appointments.map((apt) => (
            <AppointmentCard key={apt.id} appointment={apt} onClick={onCardClick} />
          ))
        )}
      </div>
    </div>
  );
}
