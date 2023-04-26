import fs from 'fs';
import type { Container } from 'inversify';
import { join } from 'path';
import YAML from 'yaml';

import { HttpServiceSymbol, type HttpServiceType } from '@users/shared/services';

export const startup = async (container: Container): Promise<void> => {
  const httpService = container.get<HttpServiceType>(HttpServiceSymbol);

  try {
    console.group('Initializing Users app function:');

    console.log('Initialization complete');
    console.groupEnd();

    if (process.env['LOCAL_MODE'] ?? false) {
      console.group('Generating documentation...');

      const response = await httpService
        .getHttpInstance()
        .get(`http://localhost:7074/api/swagger.json`);
      console.log('Saving swagger file');
      fs.writeFileSync(
        `${join(__dirname, '../../../..')}/apps/users/.apim/swagger.yaml`,
        YAML.stringify(response.data)
      );
      console.log('Documentation generated successfully');
      console.groupEnd();
    }
  } catch (error) {
    // TODO: Treat this error! Should we end the process?
    console.error('Users app function was UNABLE to start');
    console.error(error);
  }
};
