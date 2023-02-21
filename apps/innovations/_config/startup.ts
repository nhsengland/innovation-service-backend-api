import fs from 'fs';
import type { Container } from 'inversify';
import { join } from 'path';
import YAML from 'yaml';

import {
  CacheServiceSymbol, HttpServiceSymbol, NOSQLConnectionServiceSymbol, SQLConnectionServiceSymbol, type CacheServiceType, type HttpServiceType, type NOSQLConnectionServiceType, type SQLConnectionServiceType
} from '@innovations/shared/services';


export const startup = async (container: Container): Promise<void> => {

  console.log('Initializing Innovations app function');

  const cacheService = container.get<CacheServiceType>(CacheServiceSymbol);
  const httpService = container.get<HttpServiceType>(HttpServiceSymbol);
  const noSqlConnectionService = container.get<NOSQLConnectionServiceType>(NOSQLConnectionServiceSymbol);
  const sqlConnectionService = container.get<SQLConnectionServiceType>(SQLConnectionServiceSymbol);

  try {

    console.group('Initializing Innovations app function:');

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

      const response = await httpService.getHttpInstance().get(`http://localhost:7072/api/swagger.json`);
      console.log('Saving swagger file');
      fs.writeFileSync(`${join(__dirname, '../../../..')}/apps/innovations/.apim/swagger.yaml`, YAML.stringify(response.data));
      console.log('Documentation generated successfully');
      console.groupEnd();

    }

  } catch (error) {

    // TODO: Treat this error! Should we end the process?
    console.error('Innovations app function was UNABLE to start');
    console.error(error);

  }

};
