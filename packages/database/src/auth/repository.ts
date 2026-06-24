import { neon } from '@neondatabase/serverless';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import { users, sessions } from '../schema';
import { hashPassword, verifyPassword } from './hash';
import { createToken, TokenPayload } from './jwt';
import type { User, Session } from '../schema';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

export interface AuthResult {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface LoginInput {
  email: string;
  password: string;
  userAgent?: string;
  ipAddress?: string;
}

// Check if email already exists
export async function isEmailTaken(email: string): Promise<boolean> {
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0;
}

// Register new user
export async function register(input: RegisterInput): Promise<AuthResult> {
  try {
    // Check if email exists
    if (await isEmailTaken(input.email)) {
      return { success: false, error: 'Email already registered' };
    }

    // Validate password
    if (input.password.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters' };
    }

    // Hash password
    const passwordHash = await hashPassword(input.password);

    // Create user
    const [user] = await db.insert(users).values({
      email: input.email.toLowerCase(),
      passwordHash,
      name: input.name,
    }).returning();

    if (!user) {
      return { success: false, error: 'Failed to create user' };
    }

    // Create session
    const session = await createUserSession(user.id, input.userAgent, input.ipAddress);

    return {
      success: true,
      user,
      token: session.token,
    };
  } catch (error) {
    console.error('Register error:', error);
    return { success: false, error: 'Registration failed' };
  }
}

// Login user
export async function login(input: LoginInput): Promise<AuthResult> {
  try {
    // Find user by email
    const [user] = await db.select().from(users).where(eq(users.email, input.email.toLowerCase())).limit(1);

    if (!user) {
      return { success: false, error: 'Invalid email or password' };
    }

    // Verify password
    const isValid = await verifyPassword(input.password, user.passwordHash);
    if (!isValid) {
      return { success: false, error: 'Invalid email or password' };
    }

    // Check if user is active
    if (!user.isActive) {
      return { success: false, error: 'Account is deactivated' };
    }

    // Update last login
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

    // Create session
    const session = await createUserSession(user.id, input.userAgent, input.ipAddress);

    return {
      success: true,
      user,
      token: session.token,
    };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: 'Login failed' };
  }
}

// Create session helper
async function createUserSession(userId: string, userAgent?: string, ipAddress?: string): Promise<{ token: string; session: Session }> {
  // Create session in DB
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  const [session] = await db.insert(sessions).values({
    userId,
    token: '', // Will be generated
    userAgent: userAgent || null,
    ipAddress: ipAddress || null,
    expiresAt,
  }).returning();

  if (!session) {
    throw new Error('Failed to create session');
  }

  // Generate JWT
  const token = createToken({
    userId,
    email: '', // Will be replaced in actual use
    sessionId: session.id,
  });

  return { token, session };
}

// Validate session by token
export async function validateSession(token: string): Promise<{ valid: boolean; user?: User; session?: Session }> {
  try {
    // Verify JWT
    const jwt = await import('jsonwebtoken');
    const decoded = jwt.default.verify(token, process.env.JWT_SECRET || 'dev-secret-change-in-production') as TokenPayload;

    // Find session in DB
    const [session] = await db.select().from(sessions).where(eq(sessions.id, decoded.sessionId)).limit(1);

    if (!session || !session.isActive) {
      return { valid: false };
    }

    // Check if session expired
    if (new Date(session.expiresAt) < new Date()) {
      // Deactivate expired session
      await db.update(sessions).set({ isActive: false }).where(eq(sessions.id, session.id));
      return { valid: false };
    }

    // Get user
    const [user] = await db.select().from(users).where(eq(users.id, decoded.userId)).limit(1);

    if (!user || !user.isActive) {
      return { valid: false };
    }

    return { valid: true, user, session };
  } catch {
    return { valid: false };
  }
}

// Logout (invalidate session)
export async function logout(sessionId: string): Promise<boolean> {
  try {
    await db.update(sessions).set({ isActive: false }).where(eq(sessions.id, sessionId));
    return true;
  } catch {
    return false;
  }
}

// Get user by ID
export async function getUserById(userId: string): Promise<User | null> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return user || null;
}
