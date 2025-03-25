import { UseGuards, BadRequestException } from '@nestjs/common';
import { Body, Controller, Post } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { z } from 'zod';
import { ZodValidationPipe } from 'src/pipes/zod-validation-pipes';
import { AuthGuard } from '@nestjs/passport';
import { UserPayload } from 'src/auth/jwt.strategy';
import { CurrentUser } from 'src/auth/current-user-decorator';

const createOrdersBodySchema = z.object({
  clientId: z.string().uuid(),
  products: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().min(1, 'A quantidade deve ser pelo menos 1'),
      }),
    )
    .min(1, 'O pedido deve conter pelo menos um produto'),
  description: z.string().optional().default(''),
  discount: z.number().min(0, 'O desconto não pode ser negativo'),
  paymentMethod: z.enum(['PIX', 'DINHEIRO', 'CARTAO_DEBITO', 'CARTAO_CREDITO']),
});

type CreateOrdersBodySchema = z.infer<typeof createOrdersBodySchema>;

@Controller('/orders')
@UseGuards(AuthGuard('jwt'))
export class CreateOrdersController {
  constructor(private prisma: PrismaService) {}

  private async validateProducts(
    orderProducts: { productId: string; quantity: number }[],
  ) {
    const productIds = orderProducts.map((p) => p.productId);

    const productRecords = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, quantity: true, name: true, value: true },
    });

    if (productRecords.length !== orderProducts.length) {
      const foundIds = new Set(productRecords.map((p) => p.id));
      const missingProducts = orderProducts.filter(
        (p) => !foundIds.has(p.productId),
      );
      return {
        isValid: false,
        missingProducts: missingProducts.map((p) => p.productId),
      };
    }

    const productMap = new Map(productRecords.map((p) => [p.id, p]));
    const outOfStockProducts = orderProducts
      .filter(({ productId, quantity }) => {
        const product = productMap.get(productId);
        return product ? product.quantity < quantity : false;
      })
      .map(({ productId, quantity }) => ({
        productId,
        requested: quantity,
        available: productMap.get(productId)!.quantity,
        productName: productMap.get(productId)!.name || 'Sem nome',
      }));

    return {
      isValid: outOfStockProducts.length === 0,
      outOfStockProducts,
      productMap,
    };
  }

  @Post()
  async createOrder(
    @Body(new ZodValidationPipe(createOrdersBodySchema))
    body: CreateOrdersBodySchema,
    @CurrentUser() user: UserPayload,
  ) {
    const { clientId, products, description, discount, paymentMethod } = body;
    const authenticatedUserId = user.sub;

    const validationResult = await this.validateProducts(products);

    if (!validationResult.isValid) {
      if (validationResult.missingProducts) {
        throw new BadRequestException(
          `Produtos não encontrados: ${validationResult.missingProducts.join(', ')}`,
        );
      }
      if (validationResult.outOfStockProducts?.length) {
        const errorDetails = validationResult.outOfStockProducts
          .map(
            (p) =>
              `Produto ${p.productName} (ID: ${p.productId}): Solicitado ${p.requested}, Disponível ${p.available}`,
          )
          .join('; ');
        throw new BadRequestException(`Estoque insuficiente: ${errorDetails}`);
      }
    }

    const totalValue = products.reduce((sum, { productId, quantity }) => {
      const product = validationResult.productMap!.get(productId)!;
      return sum + product.value * quantity;
    }, 0);

    const totalWithDiscount = totalValue * (1 - discount / 100);

    try {
      const newOrder = await this.prisma.$transaction(async (prisma) => {
        // Atualização de estoque em lote
        await Promise.all(
          products.map(({ productId, quantity }) =>
            prisma.product.update({
              where: { id: productId },
              data: { quantity: { decrement: quantity } },
            }),
          ),
        );

        return prisma.order.create({
          data: {
            clientId,
            totalValue: totalWithDiscount,
            userId: authenticatedUserId,
            description,
            discount,
            paymentMethod,
            products: {
              connect: products.map(({ productId }) => ({ id: productId })),
            },
          },
          include: { products: true },
        });
      });

      return {
        success: true,
        order: newOrder,
        message: 'Pedido criado com sucesso',
      };
    } catch (error) {
      console.error('Erro na transação:', error);
      throw new BadRequestException('Falha ao processar o pedido');
    }
  }
}
