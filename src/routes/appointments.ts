import { Router, Request, Response } from 'express';
import {
  createAppointment,
  listAppointments,
  getAppointment,
  transitionAppointment,
} from '../services/appointmentService';
import { AppointmentStatus } from '../models/appointment';

const router = Router();

const VALID_STATUSES: AppointmentStatus[] = [
  'requested', 'confirmed', 'checked_in', 'in_treatment', 'completed', 'cancelled',
];

router.post('/', (req: Request, res: Response) => {
  const { patient_name, clinic_id, datetime, treatment_type } = req.body;

  if (!patient_name || !clinic_id || !datetime || !treatment_type) {
    res.status(400).json({
      error: 'Missing required fields: patient_name, clinic_id, datetime, treatment_type',
    });
    return;
  }

  const appointment = createAppointment({ patient_name, clinic_id, datetime, treatment_type });
  res.status(201).json({ appointment_id: appointment.id, ...appointment });
});

router.get('/', (req: Request, res: Response) => {
  const statusParam = req.query.status;
  let statuses: AppointmentStatus[] | undefined;

  if (statusParam) {
    const raw: string[] = Array.isArray(statusParam)
      ? statusParam.map(String)
      : [String(statusParam)];
    statuses = raw.filter((s): s is AppointmentStatus =>
      VALID_STATUSES.includes(s as AppointmentStatus)
    );
  }

  const result = listAppointments({
    status: statuses,
    from: req.query.from ? String(req.query.from) : undefined,
    to: req.query.to ? String(req.query.to) : undefined,
    q: req.query.q ? String(req.query.q) : undefined,
    page: req.query.page ? parseInt(String(req.query.page), 10) : undefined,
    limit: req.query.limit ? parseInt(String(req.query.limit), 10) : undefined,
  });

  res.json(result);
});

router.get('/:id', (req: Request<{ id: string }>, res: Response) => {
  const appointment = getAppointment(req.params.id);
  if (!appointment) {
    res.status(404).json({ error: 'Appointment not found' });
    return;
  }
  res.json(appointment);
});

router.patch('/:id/transition', (req: Request<{ id: string }>, res: Response) => {
  const { target_status } = req.body;

  if (!target_status) {
    res.status(400).json({ error: 'Missing required field: target_status' });
    return;
  }

  if (!VALID_STATUSES.includes(target_status)) {
    res.status(400).json({ error: `Invalid status: ${target_status}` });
    return;
  }

  const result = transitionAppointment(req.params.id, target_status, req.body.changed_by || 'admin');

  if (!result.success) {
    const statusCode = result.error === 'Appointment not found' ? 404 : 400;
    res.status(statusCode).json({
      error: result.error,
      allowed_transitions: result.allowed_transitions,
    });
    return;
  }

  res.json(result.appointment);
});

export default router;
