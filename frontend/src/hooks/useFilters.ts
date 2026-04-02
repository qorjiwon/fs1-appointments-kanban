import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppointmentStatus } from '../types';

export interface Filters {
  status: AppointmentStatus[];
  from: string;
  to: string;
  q: string;
}

export function useFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters: Filters = useMemo(() => ({
    status: (searchParams.getAll('status') as AppointmentStatus[]) || [],
    from: searchParams.get('from') || '',
    to: searchParams.get('to') || '',
    q: searchParams.get('q') || '',
  }), [searchParams]);

  const setFilters = useCallback(
    (newFilters: Partial<Filters>) => {
      const merged = { ...filters, ...newFilters };
      const params = new URLSearchParams();

      merged.status.forEach((s) => params.append('status', s));
      if (merged.from) params.set('from', merged.from);
      if (merged.to) params.set('to', merged.to);
      if (merged.q) params.set('q', merged.q);

      setSearchParams(params, { replace: true });
    },
    [filters, setSearchParams]
  );

  const clearFilters = useCallback(() => {
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  const hasActiveFilters = filters.status.length > 0 || !!filters.from || !!filters.to || !!filters.q;

  return { filters, setFilters, clearFilters, hasActiveFilters };
}
