import 'dotenv/config';
import app from './app.js';
import { Logger } from './shared/logger.js';

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  Logger.log(`API running on port ${PORT}`);
});
