import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import {
  createAppointmentDdb,
  getAppointmentDdb,
  listAppointmentsDdb,
  transitionAppointmentDdb,
} from '../dynamo/appointmentRepository';
import { AppointmentStatus } from '../models/appointment';
import { broadcastAppointmentEvent } from './broadcast';

function normalizeHttpPath(event: Parameters<APIGatewayProxyHandlerV2>[0]): string {
  const raw = event.rawPath ?? event.requestContext.http.path;
  let p = raw.replace(/\/{2,}/g, '/');
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);

  // HTTP API는 path에 스테이지가 포함될 수 있음: /prod/appointments
  const stage = (event.requestContext as { stage?: string }).stage;
  if (stage && stage !== '$default') {
    const prefix = `/${stage}`;
    if (p === prefix || p.startsWith(`${prefix}/`)) {
      p = p.slice(prefix.length) || '/';
    }
  } else if (p === '/prod' || p.startsWith('/prod/')) {
    // 일부 이벤트에서 stage 필드 없이 path만 /prod/... 로 오는 경우
    p = p.slice('/prod'.length) || '/';
  }

  return p;
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const method = event.requestContext.http.method;
  const path = normalizeHttpPath(event);

  try {
    if (method === 'POST' && path === '/appointments') {
      if (!event.body) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing body' }) };
      }
      const body = JSON.parse(event.body) as {
        patient_name?: string;
        datetime?: string;
        treatment_type?: string;
      };

      const { patient_name, datetime, treatment_type } = body;
      if (!patient_name || !datetime || !treatment_type) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: 'Missing required fields: patient_name, datetime, treatment_type',
          }),
        };
      }

      const id = uuidv4();
      const appointment = await createAppointmentDdb(
        { patient_name, datetime, treatment_type },
        id
      );

      await broadcastAppointmentEvent('appointment_created', appointment);

      return {
        statusCode: 201,
        body: JSON.stringify({ appointment_id: appointment.id, ...appointment }),
      };
    }

    if (method === 'GET' && path === '/appointments') {
      const q = event.queryStringParameters ?? {};
      const statusParams = q.status
        ? Array.isArray(q.status)
          ? q.status
          : [q.status]
        : [];
      const statuses = statusParams as AppointmentStatus[];

      const result = await listAppointmentsDdb({
        status: statuses.length > 0 ? statuses : undefined,
        from: q.from,
        to: q.to,
        q: q.q,
        page: q.page ? Number(q.page) : 1,
        limit: q.limit ? Number(q.limit) : 200,
      });

      return {
        statusCode: 200,
        body: JSON.stringify({
          data: result.items,
          pagination: {
            page: result.page,
            limit: result.limit,
            total: result.total,
            totalPages: Math.max(1, Math.ceil(result.total / result.limit)),
          },
        }),
      };
    }

    if (method === 'GET' && path.startsWith('/appointments/')) {
      const id = path.split('/')[2];
      const apt = await getAppointmentDdb(id);
      if (!apt) {
        return { statusCode: 404, body: JSON.stringify({ error: 'Appointment not found' }) };
      }
      return { statusCode: 200, body: JSON.stringify(apt) };
    }

    if (method === 'PATCH' && path.startsWith('/appointments/') && path.endsWith('/transition')) {
      const parts = path.split('/');
      const id = parts[2];

      if (!event.body) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing body' }) };
      }
      const body = JSON.parse(event.body) as { target_status?: AppointmentStatus; changed_by?: string };
      const target = body.target_status;
      if (!target) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing field: target_status' }) };
      }

      const result = await transitionAppointmentDdb(id, target, body.changed_by ?? 'admin');
      if (!result.success) {
        const statusCode = result.error === 'Appointment not found' ? 404 : 400;
        return {
          statusCode,
          body: JSON.stringify({
            error: result.error,
            allowed_transitions: result.allowed_transitions,
          }),
        };
      }

      await broadcastAppointmentEvent('appointment_updated', result.appointment!);

      return { statusCode: 200, body: JSON.stringify(result.appointment) };
    }

    return { statusCode: 404, body: JSON.stringify({ error: 'Not found' }) };
  } catch (err: any) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message ?? 'Internal error' }) };
  }
};

