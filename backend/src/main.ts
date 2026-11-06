import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { CorrelatedLogger } from './common/logger/correlated-logger';
import { buildBackendMqttOptions } from './common/mqtt/mqtt-connection-options';
import { buildSwaggerDocument } from './common/swagger/swagger-document';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useLogger(new CorrelatedLogger());
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerDocument = buildSwaggerDocument(app);
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
