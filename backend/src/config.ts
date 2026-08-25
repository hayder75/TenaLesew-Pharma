import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4100', 10),
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || '30m',
  refreshTokenTtlDays: parseInt(process.env.REFRESH_TOKEN_TTL_DAYS || '7', 10),
  corsOrigins: (process.env.CORS_ORIGIN || '*').split(',').map((s) => s.trim()),
  trialDays: parseInt(process.env.TRIAL_DAYS || '14', 10),
  pricePerBranchPerMonth: parseFloat(process.env.PRICE_PER_BRANCH_PER_MONTH || '1500'),
  isProd: process.env.NODE_ENV === 'production',
};

if (!config.databaseUrl) {
  console.error('FATAL: DATABASE_URL is not set');
  process.exit(1);
}
