// 1. Import the necessary modules and libraries
import swaggerJSDoc from 'swagger-jsdoc'

// 2. Create the swagger configuration object
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: "Tremu API",
      version: "1.0.0",
      description: "This is the API documentation for the Tremu application."
    },
    servers: [
      {
        url: "http://localhost:3000"
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: ['./src/routes/*.ts']
}

// 3. Create the Swagger object and serve the documentation
const swaggerSpec = swaggerJSDoc(options)
export default swaggerSpec