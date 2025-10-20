import bcrypt from 'bcrypt';
import { storage } from '../storage';
import { logger } from './logger.service';
import type { SignupData, LoginData, User } from '@shared/schema';

const SALT_ROUNDS = 10;

export class AuthService {
  /**
   * Hash a password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  /**
   * Verify a password against a hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Register a new user
   */
  async signup(data: SignupData): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(data.email);
      if (existingUser) {
        return { success: false, error: 'User with this email already exists' };
      }

      // Hash password
      const passwordHash = await this.hashPassword(data.password);

      // Create user
      const user = await storage.createUser({
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
      });

      logger.info('New user registered', { userId: user.id, email: user.email });
      
      return { success: true, user };
    } catch (error) {
      logger.error('Signup error', { error });
      return { success: false, error: 'Failed to create user account' };
    }
  }

  /**
   * Authenticate a user with email and password
   */
  async login(data: LoginData): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      // Find user by email
      const user = await storage.getUserByEmail(data.email);
      if (!user) {
        return { success: false, error: 'Invalid email or password' };
      }

      // Verify password
      const isValid = await this.verifyPassword(data.password, user.passwordHash);
      if (!isValid) {
        return { success: false, error: 'Invalid email or password' };
      }

      logger.info('User logged in', { userId: user.id, email: user.email });
      
      return { success: true, user };
    } catch (error) {
      logger.error('Login error', { error });
      return { success: false, error: 'Login failed' };
    }
  }

  /**
   * Create initial admin account if it doesn't exist
   */
  async createAdminIfNeeded(): Promise<void> {
    try {
      const adminEmail = 'admin@taskspark.local';
      const existingAdmin = await storage.getUserByEmail(adminEmail);
      
      if (!existingAdmin) {
        const adminPassword = this.generateSecurePassword();
        const passwordHash = await this.hashPassword(adminPassword);
        
        await storage.createUser({
          email: adminEmail,
          passwordHash,
          firstName: 'Admin',
          isAdmin: true,
          hasAIAccess: true,
        });

        logger.info('='.repeat(60));
        logger.info('ADMIN ACCOUNT CREATED');
        logger.info(`Email: ${adminEmail}`);
        logger.info(`Password: ${adminPassword}`);
        logger.info('Save these credentials securely - they will not be shown again');
        logger.info('='.repeat(60));
      }
    } catch (error) {
      logger.error('Failed to create admin account', { error });
    }
  }

  /**
   * Generate a secure random password
   */
  private generateSecurePassword(): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    
    for (let i = 0; i < 16; i++) {
      password += charset[array[i] % charset.length];
    }
    
    return password;
  }
}

export const authService = new AuthService();
