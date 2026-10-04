import { app } from './app.js';
import { config } from './config.js';
import { db } from './db/index.js';
import { seed } from './seed.js';

if (db.kind === 'json' && !(await db.list('products')).length) await seed();

app.listen(config.port, () => console.log(`FORMO API on http://localhost:${config.port} (${db.kind} database)`));
