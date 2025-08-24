import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../services/database.service';
import { config } from '../config';
import { ethers } from 'ethers';

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, name, walletAddress } = req.body;

      // Validate input
      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
      }

      // Check if user already exists
      const existingUser = await db.user.findFirst({
        where: {
          OR: [
            { email },
            ...(walletAddress ? [{ walletAddress }] : []),
          ],
        },
      });

      if (existingUser) {
        res.status(409).json({ error: 'User already exists' });
        return;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await db.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          walletAddress,
        },
        select: {
          id: true,
          email: true,
          name: true,
          walletAddress: true,
          createdAt: true,
        },
      });

      // Generate token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        config.jwt.secret as string,
        { expiresIn: config.jwt.expiresIn }
      );

      res.status(201).json({
        user,
        token,
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      // Validate input
      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
      }

      // Find user
      const user = await db.user.findUnique({
        where: { email },
      });

      if (!user) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      // Check password
      if (!user.password) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      // Check if user is active
      if (!user.isActive) {
        res.status(401).json({ error: 'Account is inactive' });
        return;
      }

      // Generate token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        config.jwt.secret as string,
        { expiresIn: config.jwt.expiresIn }
      );

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          walletAddress: user.walletAddress,
        },
        token,
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }

  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.body;

      if (!token) {
        res.status(400).json({ error: 'Token is required' });
        return;
      }

      // Verify old token (even if expired)
      const decoded = jwt.decode(token) as any;
      if (!decoded || !decoded.userId) {
        res.status(401).json({ error: 'Invalid token' });
        return;
      }

      // Check if user still exists and is active
      const user = await db.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          isActive: true,
        },
      });

      if (!user || !user.isActive) {
        res.status(401).json({ error: 'User not found or inactive' });
        return;
      }

      // Generate new token
      const newToken = jwt.sign(
        { userId: user.id, email: user.email },
        config.jwt.secret as string,
        { expiresIn: config.jwt.expiresIn }
      );

      res.json({ token: newToken });
    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(500).json({ error: 'Token refresh failed' });
    }
  }

  async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        res.status(400).json({ error: 'Current and new passwords are required' });
        return;
      }

      // Get user
      const user = await db.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Verify current password
      if (!user.password) {
        res.status(400).json({ error: 'Account has no password set' });
        return;
      }
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        res.status(401).json({ error: 'Current password is incorrect' });
        return;
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await db.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });

      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      console.error('Password change error:', error);
      res.status(500).json({ error: 'Password change failed' });
    }
  }

  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      const user = await db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          walletAddress: true,
          discordUserId: true,
          telegramChatId: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              alerts: true,
              notifications: true,
            },
          },
        },
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json(user);
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ error: 'Failed to get profile' });
    }
  }

  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { name, walletAddress } = req.body;

      // Check if wallet address is already taken
      if (walletAddress) {
        const existingUser = await db.user.findFirst({
          where: {
            walletAddress,
            NOT: { id: userId },
          },
        });

        if (existingUser) {
          res.status(409).json({ error: 'Wallet address already in use' });
          return;
        }
      }

      const updatedUser = await db.user.update({
        where: { id: userId },
        data: {
          name,
          walletAddress,
        },
        select: {
          id: true,
          email: true,
          name: true,
          walletAddress: true,
          updatedAt: true,
        },
      });

      res.json(updatedUser);
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }

  async updateNotificationSettings(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { discordUserId, telegramChatId } = req.body;

      const updatedUser = await db.user.update({
        where: { id: userId },
        data: {
          discordUserId: discordUserId || null,
          telegramChatId: telegramChatId || null,
        },
        select: {
          id: true,
          email: true,
          name: true,
          walletAddress: true,
          discordUserId: true,
          telegramChatId: true,
          updatedAt: true,
        },
      });

      res.json(updatedUser);
    } catch (error) {
      console.error('Update notification settings error:', error);
      res.status(500).json({ error: 'Failed to update notification settings' });
    }
  }

  // Wallet-based authentication methods
  async connectWallet(req: Request, res: Response): Promise<void> {
    try {
      const { walletAddress, walletType, signature, message } = req.body;

      // Validate input
      if (!walletAddress || !walletType) {
        res.status(400).json({ error: 'Wallet address and type are required' });
        return;
      }

      // Normalize wallet address
      let normalizedAddress: string;
      try {
        // More lenient validation - just check if it looks like an address
        if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
          throw new Error('Invalid format');
        }
        normalizedAddress = walletAddress.toLowerCase();
      } catch (error) {
        res.status(400).json({ error: 'Invalid wallet address format' });
        return;
      }

      // Check if wallet already exists
      const existingUser = await db.user.findUnique({
        where: { walletAddress: normalizedAddress },
      });

      if (existingUser) {
        // Update last login and return existing user
        await db.user.update({
          where: { id: existingUser.id },
          data: { 
            lastLoginAt: new Date(),
            walletType,
          },
        });

        // Generate token
        const token = jwt.sign(
          { userId: existingUser.id, walletAddress: normalizedAddress },
          config.jwt.secret as string,
          { expiresIn: config.jwt.expiresIn }
        );

        res.json({
          user: {
            id: existingUser.id,
            email: existingUser.email,
            name: existingUser.name,
            walletAddress: existingUser.walletAddress,
            isWalletUser: existingUser.isWalletUser,
          },
          token,
          isNewUser: false,
        });
        return;
      }

      // New wallet - return wallet info for registration
      res.json({
        walletAddress: normalizedAddress,
        walletType,
        isNewUser: true,
        needsRegistration: true,
      });
    } catch (error) {
      console.error('Connect wallet error:', error);
      res.status(500).json({ error: 'Failed to connect wallet' });
    }
  }

  async registerWithWallet(req: Request, res: Response): Promise<void> {
    try {
      const { walletAddress, walletType, email, name, password } = req.body;

      // Validate input
      if (!walletAddress || !walletType || !email || !name) {
        res.status(400).json({ error: 'Wallet address, type, email, and name are required' });
        return;
      }

      // Normalize wallet address
      let normalizedAddress: string;
      try {
        // More lenient validation - just check if it looks like an address
        if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
          throw new Error('Invalid format');
        }
        normalizedAddress = walletAddress.toLowerCase();
      } catch (error) {
        res.status(400).json({ error: 'Invalid wallet address format' });
        return;
      }

      // Check if user already exists (by wallet or email)
      const existingUser = await db.user.findFirst({
        where: {
          OR: [
            { walletAddress: normalizedAddress },
            { email },
          ],
        },
      });

      if (existingUser) {
        if (existingUser.walletAddress === normalizedAddress) {
          res.status(409).json({ error: 'Wallet address already registered' });
        } else {
          res.status(409).json({ error: 'Email already registered' });
        }
        return;
      }

      // Hash password if provided
      let hashedPassword = null;
      if (password) {
        hashedPassword = await bcrypt.hash(password, 10);
      }

      // Create user with wallet
      const user = await db.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          walletAddress: normalizedAddress,
          isWalletUser: true,
          walletType,
          connectedAt: new Date(),
          lastLoginAt: new Date(),
        },
        select: {
          id: true,
          email: true,
          name: true,
          walletAddress: true,
          isWalletUser: true,
          walletType: true,
          createdAt: true,
        },
      });

      // Generate token
      const token = jwt.sign(
        { userId: user.id, walletAddress: normalizedAddress },
        config.jwt.secret as string,
        { expiresIn: config.jwt.expiresIn }
      );

      res.status(201).json({
        user,
        token,
        isNewUser: true,
      });
    } catch (error) {
      console.error('Register with wallet error:', error);
      res.status(500).json({ error: 'Failed to register with wallet' });
    }
  }

  async walletLogin(req: Request, res: Response): Promise<void> {
    try {
      const { walletAddress, walletType } = req.body;

      // Validate input
      if (!walletAddress) {
        res.status(400).json({ error: 'Wallet address is required' });
        return;
      }

      // Normalize wallet address
      let normalizedAddress: string;
      try {
        // More lenient validation - just check if it looks like an address
        if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
          throw new Error('Invalid format');
        }
        normalizedAddress = walletAddress.toLowerCase();
      } catch (error) {
        res.status(400).json({ error: 'Invalid wallet address format' });
        return;
      }

      // Find user by wallet address
      const user = await db.user.findUnique({
        where: { walletAddress: normalizedAddress },
      });

      if (!user) {
        res.status(404).json({ 
          error: 'Wallet not registered',
          needsRegistration: true,
          walletAddress: normalizedAddress,
        });
        return;
      }

      // Check if user is active
      if (!user.isActive) {
        res.status(401).json({ error: 'Account is inactive' });
        return;
      }

      // Update last login
      await db.user.update({
        where: { id: user.id },
        data: { 
          lastLoginAt: new Date(),
          ...(walletType && { walletType }),
        },
      });

      // Generate token
      const token = jwt.sign(
        { userId: user.id, walletAddress: normalizedAddress },
        config.jwt.secret as string,
        { expiresIn: config.jwt.expiresIn }
      );

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          walletAddress: user.walletAddress,
          isWalletUser: user.isWalletUser,
          walletType: user.walletType,
        },
        token,
      });
    } catch (error) {
      console.error('Wallet login error:', error);
      res.status(500).json({ error: 'Wallet login failed' });
    }
  }

  async disconnectWallet(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      // Update user to remove wallet connection but keep account if they have email/password
      const user = await db.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // If user only has wallet auth (no email/password), don't allow disconnect
      if (user.isWalletUser && !user.email) {
        res.status(400).json({ 
          error: 'Cannot disconnect wallet-only account. Please add email/password first.' 
        });
        return;
      }

      // Disconnect wallet
      await db.user.update({
        where: { id: userId },
        data: {
          walletAddress: null,
          walletType: null,
          isWalletUser: false,
        },
      });

      res.json({ message: 'Wallet disconnected successfully' });
    } catch (error) {
      console.error('Disconnect wallet error:', error);
      res.status(500).json({ error: 'Failed to disconnect wallet' });
    }
  }
}