import { generateOpenApi3Spec as index } from '@aaronpowell/azure-functions-nodejs-openapi';

export default index({
  info: {
    title: 'NHS Innovation Service API - Users module',
    version: '1.0.0'
  }
});
