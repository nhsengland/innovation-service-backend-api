import { createConnection, getConnection } from 'typeorm';

import { SQLDB_TESTS_CONNECTION } from './libs/shared/src/lib/config/connections.config';


beforeAll(async () => {

  // console.log(`Preparing tests environment...`);

  const connection = await createConnection(SQLDB_TESTS_CONNECTION);

  // console.log(`Running migrations...`);
  await connection.runMigrations();

  // console.log(`Migrations Successfuly runned!`);
  // console.log(`Successfuly connected to "${SQLDB_TESTS_CONNECTION.name}" DB!`);

});


afterAll(async () => {

  getConnection(SQLDB_TESTS_CONNECTION.name).close();

});
