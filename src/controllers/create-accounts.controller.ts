import { ConflictException } from '@nestjs/common';
import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { hash } from 'bcryptjs';

@Controller('/accounts')
export class CreateAccountController {
  constructor(private prisma: PrismaService) {}

  @Post()
  @HttpCode(201)
  async handle(
    @Body()
    body: {
      email: string;
      name: string;
      password_hash: string;
      isAdmin: boolean;
    },
  ) {
    const { email, name, password_hash, isAdmin } = body;

    const userWithSameEmail = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (userWithSameEmail) {
      throw new ConflictException(
        'User with same e-mail address already exists',
      );
    }

    const hashedPassword = await hash(password_hash, 8);

    await this.prisma.user.create({
      data: {
        email,
        name,
        password_hash: hashedPassword,
        isAdmin,
      },
    });
  }
}
