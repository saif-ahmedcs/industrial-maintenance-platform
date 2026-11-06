import type { INestApplication } from '@nestjs/common';
import {
  DocumentBuilder,
  SwaggerModule,
  type OpenAPIObject,
} from '@nestjs/swagger';

export function buildSwaggerDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
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

  return SwaggerModule.createDocument(app, config);
}
