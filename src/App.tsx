import React, { useState, useCallback } from 'react';
import { Appointment } from './types';
import { useFilters } from './hooks/useFilters';
import { useAppointments } from './hooks/useAppointments';
import { useSSE } from './hooks/useSSE';
import { useToast } from './hooks/useToast';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { FilterBar } from './components/FilterBar';
import { KanbanBoard } from './components/KanbanBoard';
import { DetailPanel } from './components/DetailPanel';
import { CreateAppointmentModal } from './components/CreateAppointmentModal';
import { ToastContainer } from './components/ToastContainer';
import { ConnectionBanner } from './components/ConnectionBanner';
import { EmptyState } from './components/EmptyState';

export default function App() {
  const { filters, setFilters, clearFilters, hasActiveFilters } = useFilters();
  const { appointments, loading, error, refetch, handleSSEEvent, updateAppointmentLocally } =
    useAppointments(filters);
  const { toasts, addToast, removeToast } = useToast();
  const isOnline = useOnlineStatus();

  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const onSSEEvent = useCallback(
    (type: string, appointment: Appointment) => {
      handleSSEEvent(type, appointment);
      if (selectedAppointment?.id === appointment.id) {
        setSelectedAppointment(appointment);
      }
    },
    [handleSSEEvent, selectedAppointment?.id]
  );

  const { status: sseStatus } = useSSE(onSSEEvent);

  const handleTransition = useCallback(
    (updated: Appointment) => {
      updateAppointmentLocally(updated);
      setSelectedAppointment(updated);
      addToast('예약 상태가 변경되었습니다', 'success');
    },
    [updateAppointmentLocally, addToast]
  );

  const handleCardClick = useCallback((appointment: Appointment) => {
    setSelectedAppointment(appointment);
  }, []);

  return (
    <div className="app">
      <ConnectionBanner sseStatus={sseStatus} isOnline={isOnline} />
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
            InSpline
          </h1>
          <span className="header-subtitle">치과 예약 관리 시스템</span>
        </div>
        <button className="btn-primary create-btn" onClick={() => setShowCreate(true)}>
          + 새 예약
        </button>
      </header>

      <FilterBar
        filters={filters}
        onFilterChange={setFilters}
        onClear={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      <main className="app-main">
        {loading ? (
          <div className="loading-state">
            <div className="spinner" />
            <p>예약 정보를 불러오는 중...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <p>데이터를 불러오지 못했습니다: {error}</p>
            <button className="btn-primary" onClick={refetch}>다시 시도</button>
          </div>
        ) : appointments.length === 0 ? (
          <EmptyState hasFilters={hasActiveFilters} />
        ) : (
          <KanbanBoard appointments={appointments} onCardClick={handleCardClick} />
        )}
      </main>

      {selectedAppointment && (
        <DetailPanel
          appointment={selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
          onTransition={handleTransition}
          onError={(msg) => addToast(msg, 'error')}
        />
      )}

      {showCreate && (
        <CreateAppointmentModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            addToast('예약이 등록되었습니다', 'success');
            refetch();
          }}
          onError={(msg) => addToast(msg, 'error')}
        />
      )}
    </div>
  );
}
