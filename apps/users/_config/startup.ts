import fs from 'fs';
import type { Container } from 'inversify';
import { join } from 'path';
import YAML from 'yaml';

import {
  CacheServiceSymbol, HttpServiceSymbol, NOSQLConnectionServiceSymbol, SQLConnectionServiceSymbol, type CacheServiceType, type HttpServiceType, type NOSQLConnectionServiceType, type SQLConnectionServiceType
} from '@users/shared/services';


export const startup = async (container: Container): Promise<void> => {

  const cacheService = container.get<CacheServiceType>(CacheServiceSymbol);
  const httpService = container.get<HttpServiceType>(HttpServiceSymbol);
  const noSqlConnectionService = container.get<NOSQLConnectionServiceType>(NOSQLConnectionServiceSymbol);
  const sqlConnectionService = container.get<SQLConnectionServiceType>(SQLConnectionServiceSymbol);

  try {

    console.group('Initializing Users app function:');

    // TODO: For some reason the SQL Connection must be initialized before the remaining services. There are errors related to inversify otherwise.
    //       The inversify and startup must be revised.
    //       Additionally the init method for these must be somehow a dependency so that other services (ie: baseService) don't startup before these were initialized.
    await sqlConnectionService.init();

    await cacheService.init();
    await noSqlConnectionService.init();

    console.log('Initialization complete');
    console.groupEnd();

    if (process.env['LOCAL_MODE'] ?? false) {

      console.group('Generating documentation...');

      const response = await httpService.getHttpInstance().get(`http://localhost:7074/api/swagger.json`);
      console.log('Saving swagger file');
      fs.writeFileSync(`${join(__dirname, '../../../..')}/apps/users/.apim/swagger.yaml`, YAML.stringify(response.data));
      console.log('Documentation generated successfully');
      console.groupEnd();

    }

  } catch (error) {

    // TODO: Treat this error! Should we end the process?
    console.error('Users app function was UNABLE to start');
    console.error(error);

  }

};
