import {
  Body,
  Controller,
  Post,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from 'prisma/prisma.service';
import { CurrentUser } from 'src/auth/current-user-decorator';
import { UserPayload } from 'src/auth/jwt.strategy';
import { ZodValidationPipe } from 'src/pipes/zod-validation-pipes';
import { z } from 'zod';

const createProductsBodySchema = z.object({
  name: z
    .string()
    .min(3, 'O nome deve ter pelo menos 3 caracteres')
    .max(100, 'O nome não pode exceder 100 caracteres'),
  value: z.number().positive('O valor deve ser positivo'),
  quantity: z
    .number()
    .int('A quantidade deve ser um número inteiro')
    .min(0, 'A quantidade não pode ser negativa')
    .max(100000, 'A quantidade não pode exceder 100.000'),
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

    // Validação adicional do usuário
    if (!userId) {
      throw new BadRequestException('Usuário não autenticado');
    }

    // Verificar se produto com mesmo nome já existe
    const existingProduct = await this.prisma.product.findFirst({
      where: { name },
    });

    if (existingProduct) {
      throw new BadRequestException('Já existe um produto com este nome');
    }

    try {
      const product = await this.prisma.product.create({
        data: {
          name,
          value,
          quantity,
        },
        select: {
          id: true,
          name: true,
          value: true,
          quantity: true,
          created_at: true,
        },
      });

      return {
        success: true,
        product,
        message: 'Produto criado com sucesso',
      };
    } catch (error) {
      console.error('Erro ao criar produto:', error);
      throw new BadRequestException('Falha ao criar o produto');
    }
  }
}
