import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3333), // Converte para número e define um valor padrão
});

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Torna as variáveis de ambiente disponíveis globalmente
      envFilePath: '.env', // Especifica o arquivo .env a ser carregado
      validate: (config) => envSchema.parse(config), // Valida as variáveis de ambiente
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
