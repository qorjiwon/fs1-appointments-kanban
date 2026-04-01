import React from 'react';
import { Appointment, AppointmentStatus, KANBAN_STATUSES } from '../types';
import { KanbanColumn } from './KanbanColumn';

interface KanbanBoardProps {
  appointments: Appointment[];
  visibleStatuses?: AppointmentStatus[];
  onCardClick: (appointment: Appointment) => void;
}

export function KanbanBoard({ appointments, visibleStatuses, onCardClick }: KanbanBoardProps) {
  const statusesToShow = visibleStatuses && visibleStatuses.length > 0
    ? KANBAN_STATUSES.filter((status) => visibleStatuses.includes(status))
    : KANBAN_STATUSES;

  const grouped = KANBAN_STATUSES.reduce(
    (acc, status) => {
      acc[status] = appointments.filter((a) => a.status === status);
      return acc;
    },
    {} as Record<string, Appointment[]>
  );

  return (
    <div className="kanban-board">
      {statusesToShow.map((status) => (
        <KanbanColumn
          key={status}
          status={status}
          appointments={grouped[status] || []}
          onCardClick={onCardClick}
        />
      ))}
    </div>
  );
}
