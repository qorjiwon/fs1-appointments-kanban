import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';
import { Appointment } from '../models/appointment';
import { listConnections, removeConnection } from '../websocket/connectionsRepository';

const endpoint = process.env.WS_API_ENDPOINT; // e.g. https://xxxx.execute-api.ap-northeast-2.amazonaws.com/production
const apiClient = endpoint ? new ApiGatewayManagementApiClient({ endpoint }) : null;

export async function broadcastAppointmentEvent(
  type: 'appointment_created' | 'appointment_updated',
  appointment: Appointment
): Promise<void> {
  if (!apiClient) {
    console.warn('WS_API_ENDPOINT not set, skipping broadcast');
    return;
  }

  const connections = await listConnections();
  if (connections.length === 0) return;

  const payload = JSON.stringify({ type, appointment });

  await Promise.all(
    connections.map(async (connectionId) => {
      try {
        await apiClient.send(
          new PostToConnectionCommand({
            ConnectionId: connectionId,
            Data: Buffer.from(payload),
          })
        );
      } catch (err: any) {
        if (err.statusCode === 410) {
          // stale connection
          await removeConnection(connectionId);
        } else {
          console.error('Failed to send to connection', connectionId, err);
        }
      }
    })
  );
}

/** HTTP 핸들러용: 예약 저장/갱신은 이미 성공한 뒤 호출하며, 브로드캐스트 실패는 로그만 남기고 전파하지 않음 */
export async function broadcastAppointmentEventSafe(
  type: 'appointment_created' | 'appointment_updated',
  appointment: Appointment
): Promise<void> {
  try {
    await broadcastAppointmentEvent(type, appointment);
  } catch (err) {
    console.error('broadcastAppointmentEvent failed (appointment already persisted)', err);
  }
}

