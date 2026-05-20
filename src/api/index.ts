import express from 'express';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`API running on port ${PORT}`);
});
