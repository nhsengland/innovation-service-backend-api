import { generateOpenApi3Spec as index } from '@aaronpowell/azure-functions-nodejs-openapi';

export default index({
  info: {
    title: 'NHS Innovation Service API - Admin module',
    version: '1.0.0',
  },
  servers: [
    { url: 'https://nhse-${ENV}-innovation-service-admin-functions.azurewebsites.net/api' }
  ]
});
