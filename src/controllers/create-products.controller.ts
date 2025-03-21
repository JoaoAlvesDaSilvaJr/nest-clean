import { Controller, Post } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

@Controller('/products')
export class CreateProductsController {
  constructor(private prisma: PrismaService) {}

  @Post()
  async handle() {}
}
