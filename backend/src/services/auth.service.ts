import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh_secret';

export class AuthService {
  static async register(email: string, password: string, organizationName: string) {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) throw new Error('Email already in use');

    // Multi-tenancy logic: Find existing organization or create a new one
    let org = await prisma.organization.findFirst({ where: { name: organizationName } });
    if (!org) {
      org = await prisma.organization.create({ data: { name: organizationName } });
    }

    // Securely hash the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    // Business Logic: If they are the first user in the org, make them ADMIN. Otherwise, MEMBER.
    const userCount = await prisma.user.count({ where: { organizationId: org.id } });
    const role = userCount === 0 ? 'ADMIN' : 'MEMBER';

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        organizationId: org.id,
        role
      }
    });

    return user;
  }

  static generateTokens(userId: string, role: string, organizationId: string) {
    // Access token is short-lived for security (15 mins)
    const accessToken = jwt.sign({ userId, role, organizationId }, ACCESS_SECRET, { expiresIn: '15m' });
    // Refresh token is long-lived and ONLY used to get a new access token (7 days)
    const refreshToken = jwt.sign({ userId }, REFRESH_SECRET, { expiresIn: '7d' });
    return { accessToken, refreshToken };
  }

  static async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error('Invalid credentials');

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) throw new Error('Invalid credentials');

    return this.generateTokens(user.id, user.role, user.organizationId);
  }

  static async refresh(refreshToken: string) {
    try {
      const decoded = jwt.verify(refreshToken, REFRESH_SECRET) as { userId: string };
      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
      
      if (!user) throw new Error('User not found');
      
      return this.generateTokens(user.id, user.role, user.organizationId);
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }
}
