import { createServer } from './server';
import { config } from './lib/config';

const app = createServer();

app.listen(config.port, config.host, () => {
  console.log(`[api] Server running on http://${config.host}:${config.port}`);
});
