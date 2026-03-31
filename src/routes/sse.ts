import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { broadcaster } from '../sse/broadcaster';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  res.write('event: connected\ndata: {"status":"connected"}\n\n');

  const clientId = uuidv4();
  broadcaster.addClient(clientId, res);

  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
  });
});

export default router;
