/**
 * PostgreSQL Configuration for SPC Calculator
 * 
 * Cấu hình kết nối PostgreSQL local server
 * Sử dụng cho migration và testing
 */

export const postgresConfig = {
  host: 'localhost',
  port: 5432,
  database: 'spc_calculator',
  user: 'spc_user',
  password: 'spc_password',
  ssl: false, // Local không cần SSL
};

// Connection string format
export const postgresConnectionString = `postgresql://${postgresConfig.user}:${postgresConfig.password}@${postgresConfig.host}:${postgresConfig.port}/${postgresConfig.database}`;

// Drizzle config for PostgreSQL
export const drizzlePostgresConfig = {
  connectionString: postgresConnectionString,
  ssl: false,
};

console.log('PostgreSQL Configuration:');
console.log('- Host:', postgresConfig.host);
console.log('- Port:', postgresConfig.port);
console.log('- Database:', postgresConfig.database);
console.log('- User:', postgresConfig.user);
console.log('- Connection String:', postgresConnectionString.replace(postgresConfig.password, '****'));
