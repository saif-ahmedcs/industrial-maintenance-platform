import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { CorrelatedLogger } from './common/logger/correlated-logger';
import { buildBackendMqttOptions } from './common/mqtt/mqtt-connection-options';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useLogger(new CorrelatedLogger());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Industrial Maintenance & Asset Management Platform')
    .setDescription(
      'JWT-protected REST API for plants, assets, maintenance plans, work orders, inventory, telemetry history, notifications, and audit history. Raw telemetry ingestion arrives over MQTT, not HTTP, and is documented in docs/architecture.md rather than below.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.MQTT,
    options: buildBackendMqttOptions({
      host: process.env.MQTT_HOST as string,
      port: process.env.MQTT_PORT as string,
      password: process.env.MQTT_BACKEND_PASSWORD as string,
    }),
  });

  await app.startAllMicroservices();
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
