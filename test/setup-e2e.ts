/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { execSync } from 'node:child_process';

const prisma = new PrismaClient();

function generateUniqueDatabaseURL(schemaId: string) {
  if (!process.env.DATABASE_URL) {
    throw new Error('Please provider a DATABASE_URL environment variable.');
  }

  const url = new URL(process.env.DATABASE_URL);

  const validSchemaId = schemaId.replace(/-/g, '_').substring(0, 63);
  url.searchParams.set('schema', validSchemaId);

  return url.toString();
}

const schemaId = randomUUID();

beforeAll(async () => {
  const databaseURL = generateUniqueDatabaseURL(schemaId);
  process.env.DATABASE_URL = databaseURL;

  try {
    execSync('pnpm prisma migrate deploy');
    console.log(`Database URL for test: ${databaseURL}`);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
});

afterAll(async () => {
  if (prisma) {
    await prisma.$executeRawUnsafe(
      `DROP SCHEMA IF EXISTS "${schemaId.replace(/-/g, '_')}" CASCADE`,
    );
    await prisma.$disconnect();
    console.log('Test database schema cleaned up');
  }
});
