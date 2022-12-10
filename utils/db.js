import * as dotenv from 'dotenv';
dotenv.config();

import knex from 'knex';
export default knex({
  client: 'mysql2',
  connection: {
    host: process.env.host,
    port: process.env.db_port,
    user: process.env.user,
    password: process.env.password,
    database: process.env.database
  },
  pool: { min: 0, max: 10 }
});