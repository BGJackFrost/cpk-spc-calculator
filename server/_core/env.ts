export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  jwtSecret: process.env.JWT_SECRET ?? "default-secret-change-in-production",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // Auth mode: "manus" for Manus OAuth, "local" for local authentication
  authMode: process.env.AUTH_MODE ?? "manus",
  // Database type: "mysql" or "postgresql"
  databaseType: process.env.DATABASE_TYPE ?? "mysql",
  // PostgreSQL config (for dual-database mode)
  pgLocalEnabled: process.env.PG_LOCAL_ENABLED === "true",
  pgHost: process.env.PG_HOST ?? "localhost",
  pgPort: process.env.PG_PORT ?? "5432",
  pgUser: process.env.PG_USER ?? "spc_user",
  pgPassword: process.env.PG_PASSWORD ?? "spc_password",
  pgDatabase: process.env.PG_DATABASE ?? "spc_calculator",
  postgresUrl: process.env.POSTGRES_URL ?? "",
};
