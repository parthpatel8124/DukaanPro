import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { JWT_SECRET, authenticateToken, AuthRequest } from '../middleware/authMiddleware';

const router = Router();

// Helper to sign token
const signUserToken = (user: any, storeId?: string | null) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      storeId: storeId || user.storeId || null,
      status: user.status || 'ACTIVE'
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Seed default Super Admin & Shop Owner accounts if not present
async function ensureDefaultAccountsExist() {
  try {
    const adminEmail = 'admin@dukaanpro.com';
    const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash('admin123', 10);
      await prisma.user.create({
        data: {
          email: adminEmail,
          passwordHash,
          fullName: 'Platform Super Admin',
          phone: '9999999999',
          role: 'SUPER_ADMIN',
          status: 'ACTIVE'
        }
      });
      console.log('✅ Seeded default Super Admin (admin@dukaanpro.com / admin123)');
    }

    // Check if any Store exists without a linked User account
    const existingStore = await prisma.store.findFirst();
    if (existingStore) {
      const storeOwner = await prisma.user.findFirst({ where: { storeId: existingStore.id } });
      if (!storeOwner) {
        const ownerEmail = 'owner@dukkan.com';
        const existingUserWithEmail = await prisma.user.findUnique({ where: { email: ownerEmail } });
        if (!existingUserWithEmail) {
          const passwordHash = await bcrypt.hash('shop123', 10);
          await prisma.user.create({
            data: {
              email: ownerEmail,
              passwordHash,
              fullName: 'Shop Owner',
              phone: existingStore.phone || '9876543210',
              role: 'SHOP_OWNER',
              status: 'ACTIVE',
              storeId: existingStore.id
            }
          });
          console.log(`✅ Seeded Shop Owner for ${existingStore.name} (${ownerEmail} / shop123)`);
        }
      }
    }
  } catch (err) {
    console.warn('Could not seed default accounts:', err);
  }
}
ensureDefaultAccountsExist();

// POST /api/auth/register-shop - Create User & Shop Profile
router.post('/register-shop', async (req: Request, res: Response) => {
  try {
    const {
      email,
      password,
      fullName,
      phone,
      shopName,
      tagline,
      gstin,
      address,
      city,
      district,
      state,
      pincode,
      logoUrl
    } = req.body;

    if (!email || !password || !fullName || !shopName) {
      res.status(400).json({ success: false, error: 'Email, password, full name, and shop name are required.' });
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existingUser) {
      res.status(400).json({ success: false, error: 'An account with this email address already exists. Please sign in.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Create Store and User in a transaction
    const [store, user] = await prisma.$transaction(async (tx) => {
      const createdStore = await tx.store.create({
        data: {
          name: shopName.trim().toUpperCase(),
          tagline: (tagline || 'ELECTRONICS').trim().toUpperCase(),
          logoUrl: logoUrl || null,
          gstin: gstin ? gstin.trim().toUpperCase() : '24AUJPP7785L1ZR',
          phone: phone || '9974127474',
          address: address || 'Bazar Street',
          city: city || 'VALOD',
          district: district || 'Tapi',
          state: state || 'Gujarat',
          pincode: pincode || '394640'
        }
      });

      const createdUser = await tx.user.create({
        data: {
          email: email.toLowerCase().trim(),
          passwordHash,
          fullName: fullName.trim(),
          phone: phone || null,
          role: 'SHOP_OWNER',
          status: 'ACTIVE',
          storeId: createdStore.id
        }
      });

      return [createdStore, createdUser];
    });

    const token = signUserToken(user, store.id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
        storeId: store.id
      },
      store
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, error: 'Failed to create shop account: ' + (error.message || 'Server error') });
  }
});

// POST /api/auth/login - Authenticate User
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Please provide both email and password.' });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      include: { store: true }
    });

    if (!user || !user.passwordHash) {
      res.status(401).json({ success: false, error: 'Invalid email address or password.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ success: false, error: 'Invalid email address or password.' });
      return;
    }

    if (user.status === 'SUSPENDED') {
      res.status(403).json({ success: false, error: 'Your shop account has been suspended by DukaanPro Admin.' });
      return;
    }

    const token = signUserToken(user, user.storeId);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
        storeId: user.storeId
      },
      store: user.store
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Failed to authenticate user.' });
  }
});

// POST /api/auth/google - Sign In / Sign Up with Google
router.post('/google', async (req: Request, res: Response) => {
  try {
    const { email, fullName, googleId, shopName } = req.body;

    if (!email) {
      res.status(400).json({ success: false, error: 'Google email is required.' });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    let user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      include: { store: true }
    });

    if (!user) {
      // Check if there is an existing store in DB
      const existingStore = await prisma.store.findFirst();

      const [store, newUser] = await prisma.$transaction(async (tx) => {
        let createdStore = existingStore;
        if (!createdStore) {
          createdStore = await tx.store.create({
            data: {
              name: (shopName || `${fullName || 'MY'}'S ELECTRONICS`).toUpperCase(),
              tagline: 'ELECTRONICS & MOBILES',
              state: 'Gujarat',
              city: 'VALOD'
            }
          });
        }

        const createdUser = await tx.user.create({
          data: {
            email: cleanEmail,
            fullName: fullName || cleanEmail.split('@')[0],
            googleId: googleId || `google-${Date.now()}`,
            role: 'SHOP_OWNER',
            status: 'ACTIVE',
            storeId: createdStore.id
          }
        });

        return [createdStore, createdUser];
      });

      user = { ...newUser, store };
    }

    if (user.status === 'SUSPENDED') {
      res.status(403).json({ success: false, error: 'Your account has been suspended by Admin.' });
      return;
    }

    const token = signUserToken(user, user.storeId);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
        storeId: user.storeId
      },
      store: user.store
    });
  } catch (error: any) {
    console.error('Google auth error:', error);
    res.status(500).json({ success: false, error: 'Google authentication failed.' });
  }
});

// POST /api/auth/forgot-password - Password Reset Request
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ success: false, error: 'Please enter your registered email address.' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user) {
      // Return positive message for privacy security
      res.json({ success: true, message: 'If an account exists with this email, password reset instructions have been dispatched.' });
      return;
    }

    const resetToken = Math.random().toString(36).substring(2, 10).toUpperCase();
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry }
    });

    res.json({
      success: true,
      resetToken, // Demo helper
      message: `Password reset code sent! Your verification code is: ${resetToken}`
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, error: 'Password recovery request failed.' });
  }
});

// POST /api/auth/reset-password - Complete Password Reset
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { email, resetToken, newPassword } = req.body;
    if (!email || !resetToken || !newPassword) {
      res.status(400).json({ success: false, error: 'Email, reset token, and new password are required.' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user || user.resetToken !== resetToken) {
      res.status(400).json({ success: false, error: 'Invalid or expired password reset token.' });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null
      }
    });

    res.json({ success: true, message: 'Password reset successfully! Please sign in with your new password.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, error: 'Failed to reset password.' });
  }
});

// GET /api/auth/me - Check current token session
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { store: true }
    });

    if (!user) {
      res.status(404).json({ success: false, error: 'User account not found' });
      return;
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
        storeId: user.storeId
      },
      store: user.store
    });
  } catch (error) {
    console.error('Me endpoint error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user session' });
  }
});

// POST /api/auth/change-password - Change Password for Logged-In User
router.post('/change-password', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ success: false, error: 'Current password and new password are required.' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ success: false, error: 'New password must be at least 6 characters long.' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.passwordHash) {
      res.status(400).json({ success: false, error: 'Account not found or password login not enabled.' });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      res.status(400).json({ success: false, error: 'Incorrect current password. Please try again.' });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash }
    });

    res.json({ success: true, message: 'Password updated successfully!' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, error: 'Failed to update password.' });
  }
});

// PUT /api/auth/profile - Update User Profile (fullName, email, phone)
router.put('/profile', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { fullName, email, phone } = req.body;

    if (!fullName || !email) {
      res.status(400).json({ success: false, error: 'Full name and email address are required.' });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if email is already taken by another user
    const existingUser = await prisma.user.findFirst({
      where: {
        email: cleanEmail,
        id: { not: userId }
      }
    });

    if (existingUser) {
      res.status(400).json({ success: false, error: 'An account with this email address already exists.' });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        fullName: fullName.trim(),
        email: cleanEmail,
        phone: phone ? phone.trim() : null
      },
      include: { store: true }
    });

    const token = signUserToken(updatedUser, updatedUser.storeId);

    res.json({
      success: true,
      message: 'User profile updated successfully!',
      token,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        fullName: updatedUser.fullName,
        phone: updatedUser.phone,
        role: updatedUser.role,
        storeId: updatedUser.storeId
      },
      store: updatedUser.store
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, error: 'Failed to update user profile: ' + (error.message || 'Server error') });
  }
});

export default router;
