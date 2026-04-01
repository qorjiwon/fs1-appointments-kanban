import React, { useState } from 'react';
import { api, CreateAppointmentInput } from '../services/api';

interface CreateAppointmentModalProps {
  onClose: () => void;
  onCreated: () => void;
  onError: (msg: string) => void;
}

const TREATMENT_TYPES = ['일반 진료', '스케일링', '충치 치료', '발치', '임플란트', '교정', '미백'];

export function CreateAppointmentModal({ onClose, onCreated, onError }: CreateAppointmentModalProps) {
  const [form, setForm] = useState<CreateAppointmentInput>({
    patient_name: '',
    datetime: '',
    treatment_type: TREATMENT_TYPES[0],
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patient_name || !form.datetime) return;

    try {
      setSubmitting(true);
      await api.createAppointment({
        ...form,
        datetime: new Date(form.datetime).toISOString(),
      });
      onCreated();
      onClose();
    } catch (err) {
      onError(err instanceof Error ? err.message : '예약 생성에 실패했습니다');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="detail-header">
          <h2>새 예약 등록</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="create-form">
          <div className="form-field">
            <label>환자명 *</label>
            <input
              type="text"
              required
              value={form.patient_name}
              onChange={(e) => setForm({ ...form, patient_name: e.target.value })}
              placeholder="홍길동"
            />
          </div>
          <div className="form-field">
            <label>예약 일시 *</label>
            <input
              type="datetime-local"
              required
              value={form.datetime}
              onChange={(e) => setForm({ ...form, datetime: e.target.value })}
            />
          </div>
          <div className="form-field">
            <label>치료 유형</label>
            <select
              value={form.treatment_type}
              onChange={(e) => setForm({ ...form, treatment_type: e.target.value })}
            >
              {TREATMENT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              취소
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? '등록 중...' : '예약 등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
