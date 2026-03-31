import React from 'react';
import { AppointmentStatus, STATUS_LABELS, STATUS_COLORS, KANBAN_STATUSES } from '../types';
import { Filters } from '../hooks/useFilters';

interface FilterBarProps {
  filters: Filters;
  onFilterChange: (filters: Partial<Filters>) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
}

export function FilterBar({ filters, onFilterChange, onClear, hasActiveFilters }: FilterBarProps) {
  const toggleStatus = (status: AppointmentStatus) => {
    const current = filters.status;
    const next = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    onFilterChange({ status: next });
  };

  return (
    <div className="filter-bar">
      <div className="filter-group">
        <label className="filter-label">상태 필터</label>
        <div className="status-chips">
          {KANBAN_STATUSES.map((status) => (
            <button
              key={status}
              className={`status-chip ${filters.status.includes(status) ? 'active' : ''}`}
              style={{
                '--chip-color': STATUS_COLORS[status],
              } as React.CSSProperties}
              onClick={() => toggleStatus(status)}
            >
              {STATUS_LABELS[status]}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-group">
        <label className="filter-label">날짜 범위</label>
        <div className="date-range">
          <input
            type="date"
            value={filters.from}
            onChange={(e) => onFilterChange({ from: e.target.value })}
            className="filter-input"
          />
          <span className="date-separator">~</span>
          <input
            type="date"
            value={filters.to}
            onChange={(e) => onFilterChange({ to: e.target.value })}
            className="filter-input"
          />
        </div>
      </div>

      <div className="filter-group">
        <label className="filter-label">환자명 검색</label>
        <input
          type="text"
          placeholder="환자명으로 검색..."
          value={filters.q}
          onChange={(e) => onFilterChange({ q: e.target.value })}
          className="filter-input search-input"
        />
      </div>

      {hasActiveFilters && (
        <button className="clear-filters-btn" onClick={onClear}>
          필터 초기화
        </button>
      )}
    </div>
  );
}
