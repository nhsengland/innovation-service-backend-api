import { container } from './inversify.config';
import { join } from 'path';
import fs from 'fs';
import YAML from 'yaml';

import { HttpServiceSymbol, HttpServiceType, NOSQLConnectionServiceSymbol, NOSQLConnectionServiceType, SQLConnectionServiceSymbol, SQLConnectionServiceType } from '@users/shared/services';


export const startup = async (): Promise<void> => {

  const httpService = container.get<HttpServiceType>(HttpServiceSymbol);
  const sqlConnectionService = container.get<SQLConnectionServiceType>(SQLConnectionServiceSymbol);
  const noSqlConnectionService = container.get<NOSQLConnectionServiceType>(NOSQLConnectionServiceSymbol);

  try {

    console.group('Initializing Users app function:');

    await sqlConnectionService.init();
    await noSqlConnectionService.init();

    console.log('Initialization complete');
    console.groupEnd();


    if (process.env['LOCAL_MODE'] ?? false) {

      console.group('Generating documentation...');

      const response = await httpService.getHttpInstance().get(`http://localhost:7074/api/swagger.json`);
      console.log('Saving swagger file');
      fs.writeFileSync(`${join(__dirname, '../../../..')}/apps/users/.apim/swagger-test.yaml`, YAML.stringify(response.data))
      console.log('Documentation generated successfully');
      console.groupEnd();

    }

  } catch (error) {

    // TODO: Treat this error! Should we end the process?
    console.error('Users app function was UNABLE to start');
    console.error(error);

  }

}
