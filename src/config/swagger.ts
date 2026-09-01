import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Application, Request } from 'express';
import { OpenAPIV3 } from 'openapi-types';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Nedjmati API',
      version: '1.0.0',
      description: 'API documentation for Nedjmati backend',
    },
    servers: [],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        BearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts'],
};

const swaggerSpec = swaggerJsdoc(options) as OpenAPIV3.Document;

export const setupSwagger = (app: Application): void => {
  app.use('/api-docs', (req: Request, res, next) => {
    swaggerSpec.servers = [
      {
        url: `${req.protocol}://${req.get('host')}`,
        description: 'Dynamic server URL',
      },
    ];
    next();
  });

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};
