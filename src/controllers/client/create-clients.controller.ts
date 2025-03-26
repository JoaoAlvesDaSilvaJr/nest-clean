import {
  Body,
  Controller,
  Post,
  UseGuards,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from 'prisma/prisma.service';
import { z } from 'zod';
import { ZodValidationPipe } from 'src/pipes/zod-validation-pipes';

// Constantes de validação centralizadas
const CLIENT_VALIDATION = {
  NAME_MIN: 3,
  NAME_MAX: 100,
  EMAIL_MAX: 100,
  PHONE_MAX: 20,
  ADDRESS_MAX: 200,
  DESCRIPTION_MAX: 2200,
};

// Schema de validação com mensagens descritivas
const createClientsBodySchema = z.object({
  name: z
    .string()
    .min(
      CLIENT_VALIDATION.NAME_MIN,
      `Nome muito curto (mínimo ${CLIENT_VALIDATION.NAME_MIN} caracteres)`,
    )
    .max(
      CLIENT_VALIDATION.NAME_MAX,
      `Nome muito longo (máximo ${CLIENT_VALIDATION.NAME_MAX} caracteres)`,
    )
    .trim(),
  email: z
    .string()
    .email('Formato de e-mail inválido')
    .max(
      CLIENT_VALIDATION.EMAIL_MAX,
      `E-mail muito longo (máximo ${CLIENT_VALIDATION.EMAIL_MAX} caracteres)`,
    )
    .toLowerCase()
    .trim(),
  phone: z
    .string()
    .max(
      CLIENT_VALIDATION.PHONE_MAX,
      `Telefone muito longo (máximo ${CLIENT_VALIDATION.PHONE_MAX} caracteres)`,
    )
    .regex(
      /^[0-9()+\-\s]+$/,
      'Use apenas números, espaços, hífens e parênteses',
    )
    .optional()
    .transform((val) => val?.replace(/\D/g, '') || null),
  address: z
    .string()
    .max(
      CLIENT_VALIDATION.ADDRESS_MAX,
      `Endereço muito longo (máximo ${CLIENT_VALIDATION.ADDRESS_MAX} caracteres)`,
    )
    .optional(),
  description: z
    .string()
    .max(
      CLIENT_VALIDATION.DESCRIPTION_MAX,
      `Descrição muito longa (máximo ${CLIENT_VALIDATION.DESCRIPTION_MAX} caracteres)`,
    )
    .optional(),
});

type CreateClientsBodySchema = z.infer<typeof createClientsBodySchema>;
type ClientConflict = { email: string } | { name: string } | { phone: string };

@Controller('/clients')
@UseGuards(AuthGuard('jwt'))
export class CreateClientController {
  constructor(private prisma: PrismaService) {}

  @Post()
  async handle(
    @Body(new ZodValidationPipe(createClientsBodySchema))
    body: CreateClientsBodySchema,
  ) {
    try {
      const { email, name, phone, address, description } = body;

      // Verificação de duplicatas em paralelo com tratamento de erro
      const [emailConflict, nameConflict, phoneConflict] = await Promise.all([
        this.checkEmailConflict(email),
        this.checkNameConflict(name),
        phone ? this.checkPhoneConflict(phone) : null,
      ]).catch((error) => {
        console.error('Error checking conflicts:', error);
        throw new InternalServerErrorException('Error verifying client data');
      });

      // Verificação de conflitos
      this.verifyConflicts(emailConflict, nameConflict, phoneConflict);

      // Criação do cliente com tratamento de erro
      const client = await this.prisma.client
        .create({
          data: {
            email,
            name,
            phone,
            address,
            description,
          },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            createdAt: true,
          },
        })
        .catch((error) => {
          console.error('Database error:', error);
          throw new InternalServerErrorException('Error creating client');
        });

      return {
        success: true,
        client,
        message: 'Cliente criado com sucesso',
      };
    } catch (error) {
      // Se já for uma exceção HTTP, repassa
      if (
        error instanceof ConflictException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }
      // Outros erros são tratados como 500
      console.error('Unexpected error:', error);
      throw new InternalServerErrorException('An unexpected error occurred');
    }
  }

  private async checkEmailConflict(email: string) {
    const existing = await this.prisma.client.findUnique({ where: { email } });
    return existing ? { email } : null;
  }

  private async checkNameConflict(name: string) {
    const existing = await this.prisma.client.findFirst({ where: { name } });
    return existing ? { name } : null;
  }

  private async checkPhoneConflict(phone: string) {
    const existing = await this.prisma.client.findFirst({
      where: { phone },
      select: { phone: true },
    });
    return existing ? { phone: existing.phone! } : null;
  }

  private verifyConflicts(...conflicts: (ClientConflict | null)[]) {
    for (const conflict of conflicts) {
      if (!conflict) continue;

      if ('email' in conflict) {
        throw new ConflictException('Email already registered');
      }
      if ('name' in conflict) {
        throw new ConflictException('Name already registered');
      }
      if ('phone' in conflict) {
        throw new ConflictException('Phone already registered');
      }
    }
  }
}
