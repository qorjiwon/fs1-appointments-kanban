import React from 'react';

interface EmptyStateProps {
  hasFilters: boolean;
}

export function EmptyState({ hasFilters }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="60" cy="60" r="50" fill="#f0f4ff" stroke="#6366f1" strokeWidth="2" strokeDasharray="6 4"/>
        <rect x="35" y="35" width="50" height="50" rx="8" fill="white" stroke="#c7d2fe" strokeWidth="2"/>
        <line x1="45" y1="50" x2="75" y2="50" stroke="#c7d2fe" strokeWidth="2" strokeLinecap="round"/>
        <line x1="45" y1="58" x2="68" y2="58" stroke="#e0e7ff" strokeWidth="2" strokeLinecap="round"/>
        <line x1="45" y1="66" x2="72" y2="66" stroke="#e0e7ff" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="85" cy="35" r="12" fill="#6366f1"/>
        <line x1="81" y1="35" x2="89" y2="35" stroke="white" strokeWidth="2" strokeLinecap="round"/>
        <line x1="85" y1="31" x2="85" y2="39" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      </svg>
      <h3>{hasFilters ? '검색 결과가 없습니다' : '아직 예약이 없습니다'}</h3>
      <p>
        {hasFilters
          ? '다른 필터 조건으로 다시 검색해보세요.'
          : '상단의 "새 예약" 버튼을 눌러 첫 번째 예약을 등록하세요.'}
      </p>
    </div>
  );
}
