import 'dotenv/config';
import app from './app.js';
import { Logger } from './shared/logger.js';

const PORT = process.env.PORT || 3001;
// Bind to loopback by default so the unauthenticated API is not reachable from
// the LAN. Override with HOST (e.g. 0.0.0.0) only behind auth/a trusted proxy.
const HOST = process.env.HOST || '127.0.0.1';

app.listen(Number(PORT), HOST, () => {
  Logger.log(`API running on ${HOST}:${PORT}`);
});
