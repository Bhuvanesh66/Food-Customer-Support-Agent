import '../src/config/env.js';
import { migrate } from '../src/db/client.js';
import { DB_PATH } from '../src/config/env.js';

migrate();
console.log(`✓ Migrated schema → ${DB_PATH}`);
process.exit(0);
