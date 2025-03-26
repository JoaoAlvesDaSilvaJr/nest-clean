import { test, expect } from 'vitest';
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

  afterAll(async () => {
    await app.close();
  });

  test('[POST] /sessions', async () => {
    await prisma.user.create({
      data: {
        name: 'Not John Doe',
        email: 'notAdmin@mail.com',
        password_hash: await hash('654321', 8),
        isAdmin: false,
      },
    });

    const response = await request(app.getHttpServer()).post('/sessions').send({
      email: 'notAdmin@mail.com',
      password: '654321',
    });

    const userOnDatabase = await prisma.user.findUnique({
      where: {
        email: 'notAdmin@mail.com',
      },
    });

    expect(response.statusCode).toBe(201); // Ou outro código apropriado (200, 201, etc.)
    expect(response.body).toEqual({
      access_token: expect.any(String), // Verifica se existe um token do tipo string
    });
  });
});
