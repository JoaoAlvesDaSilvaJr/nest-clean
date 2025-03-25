import { ConflictException, UseGuards } from '@nestjs/common';
import { Body, Controller, Post } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { z } from 'zod';
import { ZodValidationPipe } from 'src/pipes/zod-validation-pipes';
import { AuthGuard } from '@nestjs/passport';

const createClientsBodySchema = z.object({
  name: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  address: z.string().optional(),
  description: z.string().optional(),
  orders: z.array(z.string().uuid()).optional(),
});

type CreateClientsBodySchema = z.infer<typeof createClientsBodySchema>;

@Controller('/clients')
@UseGuards(AuthGuard('jwt'))
export class CreateClientController {
  constructor(private prisma: PrismaService) {}

  @Post()
  async handle(
    @Body(new ZodValidationPipe(createClientsBodySchema))
    body: CreateClientsBodySchema,
  ) {
    const { email, name, address, description, phone } = body;

    const userWithSameEmail = await this.prisma.client.findUnique({
      where: {
        email,
      },
    });

    if (userWithSameEmail) {
      throw new ConflictException(
        'User with same e-mail address already exists',
      );
    }

    await this.prisma.client.create({
      data: { email, name, address, description, phone, orders: {} },
    });
  }
}
