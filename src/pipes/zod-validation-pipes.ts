import { PipeTransform, BadRequestException } from '@nestjs/common';
import { ZodError, ZodSchema } from 'zod';
import { fromZodError } from 'zod-validation-error';

export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown) {
    try {
      this.schema.parse(value);
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          message: 'Validation failed',
          statusCode: 400,
          details: fromZodError(error).message, // Usa `fromZodError` para formatar a mensagem de erro
        });
      }

      throw new BadRequestException('Validation failed');
    }
    return value;
  }
}
