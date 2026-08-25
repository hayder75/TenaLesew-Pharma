import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config';
import { prisma } from '../db';
import { ApiError } from './errors';

export type Role =
  | 'SUPER_ADMIN'
  | 'OWNER'
  | 'ADMIN'
  | 'BRANCH_MANAGER'
  | 'PHARMACIST'
  | 'CASHIER'
  | 'INVENTORY_MANAGER'
  | 'WHOLESALE_MANAGER'
  | 'ACCOUNTANT';

export interface TokenPayload {
  sub: string; // user id
  role: Role;
  tenantId: string | null;
  impersonatedBy?: string;
  type: 'access' | 'refresh';
}

export const hashPassword = (plain: string) => bcrypt.hash(plain, 10);
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

export const signAccessToken = (payload: Omit<TokenPayload, 'type'>) =>
  jwt.sign({ ...payload, type: 'access' }, config.jwtSecret, {
    expiresIn: config.accessTokenTtl,
  } as SignOptions);

export const verifyAccessToken = (token: string): TokenPayload => {
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as TokenPayload;
    if (decoded.type !== 'access') throw new Error('wrong type');
    return decoded;
  } catch {
    throw ApiError.unauthorized('Invalid or expired session');
  }
};

/** Creates a random refresh token, stores its hash, returns the raw token */
export const issueRefreshToken = async (userId: string) => {
  const raw = crypto.randomBytes(48).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
  const expiresAt = new Date(Date.now() + config.refreshTokenTtlDays * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({ data: { userId, tokenHash, expiresAt } });
  return raw;
};

export const rotateRefreshToken = async (raw: string) => {
  const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
  if (!stored || stored.revokedAt || stored.expiresAt < new Date() || !stored.user.isActive) {
    throw ApiError.unauthorized('Session expired — please sign in again');
  }
  // rotate: revoke old, issue new
  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
  const newRaw = await issueRefreshToken(stored.userId);
  return { user: stored.user, refresh: newRaw };
};

export const revokeRefreshToken = async (raw: string) => {
  const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
};

export const revokeAllUserTokens = async (userId: string) => {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
};

export const randomToken = () => crypto.randomBytes(32).toString('hex');
export const hashToken = (raw: string) => crypto.createHash('sha256').update(raw).digest('hex');
