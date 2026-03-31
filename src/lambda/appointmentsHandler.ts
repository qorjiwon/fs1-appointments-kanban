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

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const method = event.requestContext.http.method;
  const rawPath = event.requestContext.http.path;

  try {
    if (method === 'POST' && rawPath === '/appointments') {
      if (!event.body) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing body' }) };
      }
      const body = JSON.parse(event.body) as {
        patient_name?: string;
        clinic_id?: string;
        datetime?: string;
        treatment_type?: string;
      };

      const { patient_name, clinic_id, datetime, treatment_type } = body;
      if (!patient_name || !clinic_id || !datetime || !treatment_type) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: 'Missing required fields: patient_name, clinic_id, datetime, treatment_type',
          }),
        };
      }

      const id = uuidv4();
      const appointment = await createAppointmentDdb(
        { patient_name, clinic_id, datetime, treatment_type },
        id
      );

      await broadcastAppointmentEvent('appointment_created', appointment);

      return {
        statusCode: 201,
        body: JSON.stringify({ appointment_id: appointment.id, ...appointment }),
      };
    }

    if (method === 'GET' && rawPath === '/appointments') {
      const q = event.queryStringParameters ?? {};
      const statusParams = q.status
        ? Array.isArray(q.status)
          ? q.status
          : [q.status]
        : [];
      const statuses = statusParams as AppointmentStatus[];

      const items = await listAppointmentsDdb({
        status: statuses.length > 0 ? statuses : undefined,
        from: q.from,
        to: q.to,
        q: q.q,
        limit: q.limit ? Number(q.limit) : 200,
      });

      return {
        statusCode: 200,
        body: JSON.stringify({
          data: items,
          pagination: {
            page: 1,
            limit: items.length,
            total: items.length,
            totalPages: 1,
          },
        }),
      };
    }

    if (method === 'GET' && rawPath.startsWith('/appointments/')) {
      const id = rawPath.split('/')[2];
      const apt = await getAppointmentDdb(id);
      if (!apt) {
        return { statusCode: 404, body: JSON.stringify({ error: 'Appointment not found' }) };
      }
      return { statusCode: 200, body: JSON.stringify(apt) };
    }

    if (method === 'PATCH' && rawPath.startsWith('/appointments/') && rawPath.endsWith('/transition')) {
      const parts = rawPath.split('/');
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

