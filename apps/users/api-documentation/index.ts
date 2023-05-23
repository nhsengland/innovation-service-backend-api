import { generateOpenApi3Spec as index } from '@aaronpowell/azure-functions-nodejs-openapi';

export default index({
  info: {
    title: 'Users API @ NHS Innovation Service',
    version: '1.0.0'
  },
  servers: [{ url: 'https://nhse-${ENV}-innovation-service-user-functions.azurewebsites.net/api' }]
});
