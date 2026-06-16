import 'dotenv/config';
import app from './app.js';
import db from './shared/database.js';
import { Logger } from './shared/logger.js';
import { ExchangeRatesRepository } from './exchange-rates/exchangeRates.repository.js';
import { createExchangeRatesProvider } from './exchange-rates/exchangeRates.provider.js';
import { ExchangeRatesSync } from './exchange-rates/exchangeRates.sync.js';

const PORT = process.env.PORT || 3001;
// Bind to loopback by default so the unauthenticated API is not reachable from
// the LAN. Override with HOST (e.g. 0.0.0.0) only behind auth/a trusted proxy.
const HOST = process.env.HOST || '127.0.0.1';

app.listen(Number(PORT), HOST, () => {
  Logger.log(`API running on ${HOST}:${PORT}`);

  // Pull fresh + historical rates from the provider in the background. Kept out
  // of app.ts so HTTP tests never hit the network; failures are self-logged.
  // Skipped entirely when running offline.
  if (process.env['RATES_OFFLINE'] !== '1' && process.env['RATES_OFFLINE'] !== 'true') {
    const sync = new ExchangeRatesSync(
      new ExchangeRatesRepository(db),
      createExchangeRatesProvider(),
    );
    void sync.sync();
  }
});
