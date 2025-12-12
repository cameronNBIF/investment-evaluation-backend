import { app } from './server';
import { config } from './config';

app.listen(config.port, () => {
  console.log(`Scoring service running on port ${config.port}`);
});
