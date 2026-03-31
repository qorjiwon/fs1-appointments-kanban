import {
  DynamoDBClient,
} from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { Appointment, AppointmentStatus, TransitionRecord } from '../models/appointment';
import { getAllowedTransitions, isTransitionAllowed } from '../services/stateMachine';

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

const TABLE = process.env.APPOINTMENTS_TABLE ?? 'Appointments';
const STATUS_INDEX = process.env.APPOINTMENTS_STATUS_INDEX ?? 'status-datetime-index';

export interface CreateAppointmentInput {
  patient_name: string;
  clinic_id: string;
  datetime: string;
  treatment_type: string;
}

export interface ListAppointmentsQuery {
  status?: AppointmentStatus[];
  from?: string;
  to?: string;
  q?: string;
  limit?: number;
}

export async function createAppointmentDdb(input: CreateAppointmentInput, id: string): Promise<Appointment> {
  const now = new Date().toISOString();
  const item: Appointment = {
    id,
    patient_name: input.patient_name,
    clinic_id: input.clinic_id,
    datetime: input.datetime,
    treatment_type: input.treatment_type,
    status: 'requested',
    transition_history: [],
    created_at: now,
    updated_at: now,
  };

  await ddb.send(
    new PutCommand({
      TableName: TABLE,
      Item: item,
    })
  );

  return item;
}

export async function getAppointmentDdb(id: string): Promise<Appointment | undefined> {
  const res = await ddb.send(
    new GetCommand({
      TableName: TABLE,
      Key: { id },
    })
  );
  return res.Item as Appointment | undefined;
}

export async function listAppointmentsDdb(query: ListAppointmentsQuery): Promise<Appointment[]> {
  if (query.status && query.status.length === 1) {
    // 단일 상태는 GSI로 조회
    const status = query.status[0];
    const params: any = {
      TableName: TABLE,
      IndexName: STATUS_INDEX,
      KeyConditionExpression: '#status = :s',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':s': status },
    };

    if (query.from || query.to) {
      const parts: string[] = ['#status = :s'];
      if (query.from) {
        parts.push('#dt >= :from');
      }
      if (query.to) {
        parts.push('#dt <= :to');
      }
      params.KeyConditionExpression = parts.join(' AND ');
      params.ExpressionAttributeNames['#dt'] = 'datetime';
      if (query.from) params.ExpressionAttributeValues[':from'] = query.from;
      if (query.to) params.ExpressionAttributeValues[':to'] = query.to!.includes('T')
        ? query.to
        : `${query.to}T23:59:59`;
    }

    const res = await ddb.send(new QueryCommand(params));
    let items = (res.Items ?? []) as Appointment[];
    if (query.q) {
      const s = query.q.toLowerCase();
      items = items.filter((a) => a.patient_name.toLowerCase().includes(s));
    }
    return items;
  }

  // 상태가 없거나 여러 개인 경우: 단순 스캔 (테이크홈 수준에선 허용)
  const res = await ddb.send(
    new ScanCommand({
      TableName: TABLE,
    })
  );

  let items = (res.Items ?? []) as Appointment[];

  if (query.status && query.status.length > 0) {
    items = items.filter((a) => query.status!.includes(a.status));
  }
  if (query.from) {
    items = items.filter((a) => a.datetime >= query.from!);
  }
  if (query.to) {
    const toEnd = query.to.includes('T') ? query.to : `${query.to}T23:59:59`;
    items = items.filter((a) => a.datetime <= toEnd);
  }
  if (query.q) {
    const s = query.q.toLowerCase();
    items = items.filter((a) => a.patient_name.toLowerCase().includes(s));
  }

  items.sort((a, b) => a.datetime.localeCompare(b.datetime));
  if (query.limit && items.length > query.limit) {
    return items.slice(0, query.limit);
  }
  return items;
}

export interface TransitionResult {
  success: boolean;
  appointment?: Appointment;
  error?: string;
  allowed_transitions?: AppointmentStatus[];
}

export async function transitionAppointmentDdb(
  id: string,
  targetStatus: AppointmentStatus,
  changedBy: string
): Promise<TransitionResult> {
  const current = await getAppointmentDdb(id);
  if (!current) {
    return { success: false, error: 'Appointment not found' };
  }

  const allowed = getAllowedTransitions(current.status);
  if (!isTransitionAllowed(current.status, targetStatus)) {
    return {
      success: false,
      error: `Cannot transition from '${current.status}' to '${targetStatus}'`,
      allowed_transitions: allowed,
    };
  }

  const record: TransitionRecord = {
    timestamp: new Date().toISOString(),
    from_status: current.status,
    to_status: targetStatus,
    changed_by: changedBy,
  };

  const updatedHistory = [...(current.transition_history ?? []), record];
  const updatedAt = new Date().toISOString();

  const res = await ddb.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { id },
      UpdateExpression:
        'SET #status = :s, #updated_at = :u, #history = list_append(if_not_exists(#history, :empty), :rec)',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#updated_at': 'updated_at',
        '#history': 'transition_history',
      },
      ExpressionAttributeValues: {
        ':s': targetStatus,
        ':u': updatedAt,
        ':rec': [record],
        ':empty': [],
      },
      ReturnValues: 'ALL_NEW',
    })
  );

  const updated = res.Attributes as Appointment;
  return { success: true, appointment: updated };
}

