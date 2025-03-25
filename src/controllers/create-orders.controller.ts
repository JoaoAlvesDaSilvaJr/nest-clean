import { UseGuards } from '@nestjs/common';
import { Body, Controller, Post } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { z } from 'zod';
import { ZodValidationPipe } from 'src/pipes/zod-validation-pipes';
import { AuthGuard } from '@nestjs/passport';
import { UserPayload } from 'src/auth/jwt.strategy';
import { CurrentUser } from 'src/auth/current-user-decorator';

const createOrdersBodySchema = z.object({
  clientId: z.string().uuid(), // ID do cliente deve ser um UUID válido
  products: z
    .array(
      z.object({
        productId: z.string().uuid(), // ID do produto deve ser um UUID válido
        quantity: z.number().int().min(1, 'A quantidade deve ser pelo menos 1'), // A quantidade deve ser positiva e inteira
      }),
    )
    .min(1, 'O pedido deve conter pelo menos um produto'), // Garantir que pelo menos um produto seja adicionado
  description: z.string().optional().default(''), // Descrição do pedido, opcional
  discount: z.number().min(0, 'O desconto não pode ser negativo'), // O desconto não pode ser negativo
  paymentMethod: z.enum(['PIX', 'DINHEIRO', 'CARTAO_DEBITO', 'CARTAO_CREDITO']), // Métodos de pagamento permitidos
});

type CreateOrdersBodySchema = z.infer<typeof createOrdersBodySchema>;

@Controller('/orders')
@UseGuards(AuthGuard('jwt'))
export class CreateOrdersController {
  constructor(private prisma: PrismaService) {}

  @Post()
  async createOrder(
    @Body(new ZodValidationPipe(createOrdersBodySchema))
    body: CreateOrdersBodySchema,
    @CurrentUser() user: UserPayload,
  ) {
    const { clientId, products, description, discount, paymentMethod } = body;

    const authenticatedUserId = user.sub;

    // Calcular o valor total dos produtos
    let totalValue = 0;

    // Buscar os preços dos produtos no banco de dados
    const productData = await this.prisma.product.findMany({
      where: {
        id: { in: products.map((p) => p.productId) }, // Pega os produtos pelos IDs passados
      },
    });

    // Calcular o valor total considerando a quantidade de cada produto
    for (const product of productData) {
      const productInRequest = products.find((p) => p.productId === product.id);
      if (productInRequest) {
        totalValue += product.value * productInRequest.quantity;
      }
    }

    // Aplicar o desconto
    const discountAmount = totalValue * (discount / 100);
    totalValue -= discountAmount;

    // Criar o pedido no banco de dados usando Prisma
    const newOrder = await this.prisma.order.create({
      data: {
        clientId,
        totalValue,
        userId: authenticatedUserId,
        description,
        discount,
        paymentMethod,
        products: {
          connect: products.map((product) => ({ id: product.productId })), // Relacionando os produtos
        },
      },
      include: {
        products: true, // Inclui os produtos no retorno da criação
      },
    });

    return newOrder;
  }
}
