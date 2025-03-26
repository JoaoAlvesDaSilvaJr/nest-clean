/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  describe,
} from 'vitest';
import { AppModule } from '@/app.module';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { PrismaService } from 'prisma/prisma.service';
import { hash } from 'bcryptjs';

describe('Authenticate (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    prisma = moduleRef.get(PrismaService);

    await app.init();
  });

  beforeEach(async () => {
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  const userData = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'correctpassword',
  };

  test('should authenticate user with valid credentials', async () => {
    await prisma.user.create({
      data: {
        name: userData.name,
        email: userData.email,
        password_hash: await hash(userData.password, 8),
      },
    });

    const response = await request(app.getHttpServer()).post('/sessions').send({
      email: userData.email,
      password: userData.password,
    });

    expect(response.statusCode).toBe(201);
    expect(response.body).toEqual({
      access_token: expect.any(String),
    });
  });

  test('should not authenticate with wrong password', async () => {
    await prisma.user.create({
      data: {
        name: 'Test User',
        email: 'test@example.com',
        password_hash: await hash('correctpassword', 8),
      },
    });

    const response = await request(app.getHttpServer()).post('/sessions').send({
      email: 'test@example.com',
      password: 'wrongpassword',
    });

    expect(response.statusCode).toBe(401);
    expect(response.body).toEqual({
      error: 'Unauthorized',
      message: 'Invalid credentials',
      statusCode: 401,
    });
  });

  test('should not authenticate with non-existent email', async () => {
    const response = await request(app.getHttpServer()).post('/sessions').send({
      email: 'nonexistent@example.com',
      password: 'anypassword',
    });

    expect(response.statusCode).toBe(401);
    expect(response.body).toEqual({
      error: 'Unauthorized',
      message: 'Invalid credentials',
      statusCode: 401,
    });
  });

  test('should reject request with invalid email format', async () => {
    const response = await request(app.getHttpServer()).post('/sessions').send({
      email: 'invalid-email',
      password: 'anypassword',
    });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toMatch(/email|validation/i);
  });

  test('should reject request with empty password', async () => {
    // Act
    const response = await request(app.getHttpServer()).post('/sessions').send({
      email: 'test@example.com',
      password: '',
    });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toMatch(/password|validation/i);
  });
});
