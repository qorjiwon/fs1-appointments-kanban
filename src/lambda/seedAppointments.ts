import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { createAppointmentDdb, transitionAppointmentDdb } from '../dynamo/appointmentRepository';

export const handler: APIGatewayProxyHandlerV2 = async () => {
  const today = new Date();
  const dt = (hour: number, min: number = 0) =>
    new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour, min).toISOString();

  const seeds = [
    { patient_name: '김민수', treatment_type: '스케일링', datetime: dt(9, 0), steps: [] },
    { patient_name: '오태현', treatment_type: '크라운', datetime: dt(13, 0), steps: [] },
    { patient_name: '이서연', treatment_type: '충치 치료', datetime: dt(9, 30), steps: ['confirmed'] },
    { patient_name: '강예린', treatment_type: '미백', datetime: dt(13, 30), steps: ['confirmed'] },
    { patient_name: '박준혁', treatment_type: '임플란트 상담', datetime: dt(10, 0), steps: ['confirmed', 'checked_in'] },
    { patient_name: '윤승민', treatment_type: '신경 치료', datetime: dt(14, 0), steps: ['confirmed', 'checked_in'] },
    {
      patient_name: '정하은',
      treatment_type: '교정 상담',
      datetime: dt(11, 0),
      steps: ['confirmed', 'checked_in', 'in_treatment'],
    },
  ] as const;

  for (const seed of seeds) {
    const id = uuidv4();
    const apt = await createAppointmentDdb(
      { patient_name: seed.patient_name, clinic_id: 'clinic-1', datetime: seed.datetime, treatment_type: seed.treatment_type },
      id
    );
    for (const status of seed.steps) {
      await transitionAppointmentDdb(apt.id, status, 'seed');
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ message: `Seeded ${seeds.length} appointments` }),
  };
};

