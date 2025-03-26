/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { test, expect } from 'vitest';
import { AppModule } from '@/app.module';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { PrismaService } from 'prisma/prisma.service';
import { hash } from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';

describe('Accounts (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    prisma = moduleRef.get(PrismaService);
    jwt = moduleRef.get(JwtService);

    await app.init();
  });

  beforeEach(async () => {
    await prisma.user.deleteMany();
    await prisma.client.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  const userData = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'correctpassword',
  };

  const clientData = {
    name: 'Test Client',
    email: 'client@example.com',
    phone: '(11) 99999-9999',
    address: '123 Main St',
    description: 'Test description',
  };

  const createTestUser = async () => {
    return await prisma.user.create({
      data: {
        name: userData.name,
        email: userData.email,
        password_hash: await hash(userData.password, 8),
      },
    });
  };

  const getAuthToken = (userId: string) => jwt.sign({ sub: userId });

  test('[POST] /clients - should create client', async () => {
    const user = await createTestUser();
    const accessToken = getAuthToken(user.id);

    const response = await request(app.getHttpServer())
      .post('/clients')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        email: clientData.email,
        name: clientData.name,
        phone: clientData.phone,
        address: clientData.address,
        description: clientData.address,
      });

    expect(response.statusCode).toBe(201);
    expect(response.body).toEqual({
      success: true,
      client: expect.objectContaining({
        name: clientData.name,
        email: clientData.email,
      }),
      message: expect.any(String),
    });
  });

  test('[POST] /clients - should reject request without authorization', async () => {
    const response = await request(app.getHttpServer())
      .post('/clients')
      .send(clientData);

    expect(response.statusCode).toBe(401);
    expect(response.body.message).toBe('Unauthorized');
  });

  test('[POST] /clients - should reject invalid email format', async () => {
    const user = await createTestUser();
    const accessToken = getAuthToken(user.id);

    const response = await request(app.getHttpServer())
      .post('/clients')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        ...clientData,
        email: 'invalid-email',
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toMatch(/email|validation/i);
  });

  test('[POST] /clients - should reject short name (less than 3 chars)', async () => {
    const user = await createTestUser();
    const accessToken = getAuthToken(user.id);

    const response = await request(app.getHttpServer())
      .post('/clients')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        ...clientData,
        name: 'Ab',
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.details).toMatch(/nome.*mínimo/i);
  });

  test('[POST] /clients - should reject long name (more than 100 chars)', async () => {
    const user = await createTestUser();
    const accessToken = getAuthToken(user.id);

    const response = await request(app.getHttpServer())
      .post('/clients')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        ...clientData,
        name: 'A'.repeat(101),
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.details).toMatch(/nome.*máximo/i);
  });

  test('[POST] /clients - should reject invalid phone format', async () => {
    const user = await createTestUser();
    const accessToken = getAuthToken(user.id);

    const response = await request(app.getHttpServer())
      .post('/clients')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        ...clientData,
        phone: 'invalid-phone',
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toMatch(/Validation |failed/i);
  });

  test('[POST] /clients - should accept request without optional fields', async () => {
    const user = await createTestUser();
    const accessToken = getAuthToken(user.id);

    const { ...requiredData } = clientData;

    const response = await request(app.getHttpServer())
      .post('/clients')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(requiredData);

    expect(response.statusCode).toBe(201);
    expect(response.body.client).toEqual(
      expect.objectContaining({
        name: requiredData.name,
        email: requiredData.email.toLowerCase(),
      }),
    );
    expect(response.body.client).toHaveProperty('id');
    expect(response.body.client).toHaveProperty('createdAt');
  });
});
