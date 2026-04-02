import express from 'express';
import cors from 'cors';
import appointmentsRouter from './routes/appointments';
import { seedAppointments } from './services/appointmentService';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: true }));
app.use(express.json());

app.use('/appointments', appointmentsRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

seedAppointments();

app.listen(PORT, () => {
  console.log(`InSpline API running on port ${PORT}`);
});
