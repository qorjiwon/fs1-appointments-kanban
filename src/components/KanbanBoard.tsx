import React from 'react';
import { Appointment, KANBAN_STATUSES } from '../types';
import { KanbanColumn } from './KanbanColumn';

interface KanbanBoardProps {
  appointments: Appointment[];
  onCardClick: (appointment: Appointment) => void;
}

export function KanbanBoard({ appointments, onCardClick }: KanbanBoardProps) {
  const grouped = KANBAN_STATUSES.reduce(
    (acc, status) => {
      acc[status] = appointments.filter((a) => a.status === status);
      return acc;
    },
    {} as Record<string, Appointment[]>
  );

  return (
    <div className="kanban-board">
      {KANBAN_STATUSES.map((status) => (
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
