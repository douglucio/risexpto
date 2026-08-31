import 'dotenv/config';
import { defineConfig } from 'prisma/config';

const generationOnlyUrl = 'postgresql://risexpto:local@127.0.0.1:5432/risexpto';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'tsx prisma/seed.ts' },
  datasource: { url: process.env.DATABASE_URL ?? generationOnlyUrl },
});
