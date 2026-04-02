import React, { useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Appointment,
  AppointmentStatus,
  STATUS_LABELS,
  STATUS_ACTION_LABELS,
  STATUS_COLORS,
  STATUS_BG_COLORS,
  ALLOWED_TRANSITIONS,
  FLOW_STATUSES,
} from '../types';
import { api } from '../services/api';

interface DetailPanelProps {
  appointment: Appointment;
  onClose: () => void;
  onTransition: (updated: Appointment) => void;
  onError: (message: string) => void;
}

type TooltipPlacement = 'top' | 'bottom';

function PortalTooltip({
  content,
  placement = 'top',
  children,
}: {
  content?: string;
  placement?: TooltipPlacement;
  children: React.ReactNode;
}) {
  const id = useId();
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number; width: number }>({ left: 0, top: 0, width: 0 });

  const tooltip = useMemo(() => {
    if (!content || !open) return null;

    const top = placement === 'top' ? pos.top - 10 : pos.top + 10;
    return (
      <div
        id={id}
        className={`portal-tooltip ${placement}`}
        style={{ left: pos.left, top, maxWidth: Math.min(360, Math.max(220, pos.width + 80)) }}
        role="tooltip"
      >
        {content}
      </div>
    );
  }, [content, open, placement, pos.left, pos.top, pos.width, id]);

  const updatePosAndOpen = (nextOpen: boolean) => {
    if (!content) return;
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({ left: rect.left + rect.width / 2, top: placement === 'top' ? rect.top : rect.bottom, width: rect.width });
    setOpen(nextOpen);
  };

  return (
    <div
      ref={wrapRef}
      className="portal-tooltip-anchor"
      aria-describedby={content && open ? id : undefined}
      onMouseEnter={() => updatePosAndOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => updatePosAndOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {tooltip ? createPortal(tooltip, document.body) : null}
    </div>
  );
}

const FLOW_INDEX: Record<AppointmentStatus, number> = {
  requested: 0,
  confirmed: 1,
  checked_in: 2,
  in_treatment: 3,
  completed: 4,
  cancelled: -1,
};

export function DetailPanel({ appointment, onClose, onTransition, onError }: DetailPanelProps) {
  const [transitioning, setTransitioning] = useState<AppointmentStatus | null>(null);
  const allowed = ALLOWED_TRANSITIONS[appointment.status] || [];
  const isCancelled = appointment.status === 'cancelled';
  const isTerminal = allowed.length === 0;
  const currentFlowIdx = FLOW_INDEX[appointment.status];

  const allowedLabels = allowed.map((s) => STATUS_LABELS[s]).join(', ');
  const disabledTooltip = allowedLabels
    ? `이 상태에서는 [${allowedLabels}]로만 전이 가능합니다.`
    : '최종 상태이므로 전이할 수 없습니다.';

  const handleTransition = async (targetStatus: AppointmentStatus) => {
    try {
      setTransitioning(targetStatus);
      const updated = await api.transitionAppointment(appointment.id, targetStatus);
      onTransition(updated);
    } catch (err: unknown) {
      const error = err as Error & { body?: { error?: string; allowed_transitions?: string[] } };
      const allowedTransitions = error.body?.allowed_transitions;
      const msg =
        allowedTransitions && allowedTransitions.length > 0
          ? `이 상태에서는 [${allowedTransitions
              .map((s) => STATUS_LABELS[s as AppointmentStatus] ?? s)
              .join(', ')}]로만 전이 가능합니다.`
          : error.body?.error || error.message || '상태 변경에 실패했습니다';
      onError(msg);
    } finally {
      setTransitioning(null);
    }
  };

  const aptDate = new Date(appointment.datetime).toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="detail-header">
          <h2>예약 상세</h2>
          <button className="close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="detail-body">
          {/* Patient Info Card */}
          <div
            className="patient-info-card"
            style={{ '--status-bg': STATUS_BG_COLORS[appointment.status], '--status-color': STATUS_COLORS[appointment.status] } as React.CSSProperties}
          >
            <div className="patient-details">
              <span className="patient-info-name">{appointment.patient_name}</span>
              <span className="patient-info-treatment">{appointment.treatment_type}</span>
            </div>
            <span
              className="status-badge large"
              style={{ backgroundColor: STATUS_COLORS[appointment.status] }}
            >
              {STATUS_LABELS[appointment.status]}
            </span>
          </div>

          {/* Appointment Details */}
          <div className="detail-info-list">
            <div className="detail-info-row">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <span>{aptDate}</span>
            </div>
          </div>

          {/* Progress Stepper */}
          <div className="progress-section">
            <h3>진행 현황</h3>
            {isCancelled ? (
              <div className="cancelled-notice">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                <span>이 예약은 취소되었습니다</span>
              </div>
            ) : (
              <div className="stepper">
                {FLOW_STATUSES.map((status, idx) => {
                  const isDone = idx < currentFlowIdx;
                  const isCurrent = idx === currentFlowIdx;
                  const isFuture = idx > currentFlowIdx;
                  return (
                    <React.Fragment key={status}>
                      <div className={`step ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''} ${isFuture ? 'future' : ''}`}>
                        <div className="step-dot">
                          {isDone ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          ) : (
                            <span>{idx + 1}</span>
                          )}
                        </div>
                        <span className="step-label">{STATUS_LABELS[status]}</span>
                      </div>
                      {idx < FLOW_STATUSES.length - 1 && (
                        <div className={`step-connector ${isDone ? 'done' : ''}`} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="action-section">
            <h3>예약 상태 변경</h3>

            {isTerminal ? (
              <div className="terminal-notice">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span>{isCancelled ? '취소된 예약은 상태를 변경할 수 없습니다.' : '완료된 예약은 상태를 변경할 수 없습니다.'}</span>
              </div>
            ) : (
              <>
                <div className="status-flow-row" aria-label="예약 상태 흐름">
                  {FLOW_STATUSES.map((status, idx) => {
                    const isCurrent = status === appointment.status;
                    const isAllowed = allowed.includes(status);
                    const isClickable = !isCurrent && isAllowed && transitioning === null;
                    const isDisabled = !isCurrent && (!isAllowed || transitioning !== null);
                    const tooltip = isDisabled ? disabledTooltip : undefined;

                    return (
                      <React.Fragment key={status}>
                        <PortalTooltip content={tooltip}>
                          <button
                            className={`flow-btn ${isCurrent ? 'current' : ''} ${isDisabled ? 'disabled' : ''}`}
                            disabled={!isClickable}
                            onClick={() => handleTransition(status)}
                            style={{ '--action-color': STATUS_COLORS[status] } as React.CSSProperties}
                            aria-current={isCurrent ? 'step' : undefined}
                          >
                            <span className="flow-dot" />
                            <span className="flow-label">{STATUS_LABELS[status]}</span>
                          </button>
                        </PortalTooltip>
                        {idx < FLOW_STATUSES.length - 1 && (
                          <div className="flow-arrow" aria-hidden="true">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <path d="M5 12h14"/><polyline points="12 5 19 12 12 19"/>
                            </svg>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}

                  <PortalTooltip content={!allowed.includes('cancelled') ? disabledTooltip : undefined}>
                    <button
                      className="flow-btn cancel"
                      disabled={transitioning !== null || !allowed.includes('cancelled')}
                      onClick={() => handleTransition('cancelled')}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                      </svg>
                      {transitioning === 'cancelled' ? '처리 중...' : '예약 취소'}
                    </button>
                  </PortalTooltip>
                </div>

                {allowed.filter((s) => s !== 'cancelled').length > 0 && (
                  <p className="action-hint">
                    현재 <strong>{STATUS_LABELS[appointment.status]}</strong> 상태입니다.
                    {' '}{allowed.filter((s) => s !== 'cancelled').map((s) => STATUS_LABELS[s]).join(' 또는 ')}(으)로 변경할 수 있습니다.
                  </p>
                )}
              </>
            )}
          </div>

          {/* Timeline */}
          <div className="history-section">
            <h3>처리 기록</h3>
            {appointment.transition_history.length === 0 ? (
              <div className="no-history">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                <span>아직 처리 기록이 없습니다</span>
              </div>
            ) : (
              <div className="timeline">
                {[...appointment.transition_history].reverse().map((record, idx) => {
                  const time = new Date(record.timestamp);
                  return (
                    <div key={idx} className="timeline-item">
                      <div className="timeline-dot" style={{ background: STATUS_COLORS[record.to_status] }} />
                      <div className="timeline-card">
                        <div className="timeline-change">
                          <span
                            className="status-badge small"
                            style={{ backgroundColor: STATUS_COLORS[record.from_status] }}
                          >
                            {STATUS_LABELS[record.from_status]}
                          </span>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round">
                            <path d="M5 12h14"/><polyline points="12 5 19 12 12 19"/>
                          </svg>
                          <span
                            className="status-badge small"
                            style={{ backgroundColor: STATUS_COLORS[record.to_status] }}
                          >
                            {STATUS_LABELS[record.to_status]}
                          </span>
                        </div>
                        <div className="timeline-meta">
                          <span>
                            {time.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                            {' '}
                            {time.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="timeline-who">담당: {record.changed_by}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
