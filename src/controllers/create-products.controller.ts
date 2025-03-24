import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from 'prisma/prisma.service';
import { CurrentUser } from 'src/auth/current-user-decorator';
import { UserPayload } from 'src/auth/jwt.strategy';
import { ZodValidationPipe } from 'src/pipes/zod-validation-pipes';
import { z } from 'zod';

const createProductsBodySchema = z.object({
  name: z.string(),
  value: z.number(),
  quantity: z.number(),
});

type CreateProductsBodySchema = z.infer<typeof createProductsBodySchema>;

@Controller('/products')
@UseGuards(AuthGuard('jwt'))
export class CreateProductsController {
  constructor(private prisma: PrismaService) {}

  @Post()
  async handle(
    @Body(new ZodValidationPipe(createProductsBodySchema))
    body: CreateProductsBodySchema,
    @CurrentUser() user: UserPayload,
  ) {
    const { name, value, quantity } = body;
    const { sub: userId } = user;

    console.log('User ID:', userId);

    await this.prisma.product.create({
      data: {
        name,
        value,
        quantity,
      },
    });
  }
}
