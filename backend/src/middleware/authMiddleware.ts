import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || 'dukaanpro_super_secret_jwt_key_2026';

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: 'SUPER_ADMIN' | 'SHOP_OWNER';
  storeId?: string | null;
  status: 'ACTIVE' | 'SUSPENDED';
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    res.status(401).json({ success: false, error: 'Access token required. Please sign in.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    if (decoded.status === 'SUSPENDED') {
      res.status(403).json({ success: false, error: 'Your account or shop has been suspended by Admin.' });
      return;
    }
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ success: false, error: 'Invalid or expired token. Please log in again.' });
  }
};

export const requireSuperAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'SUPER_ADMIN') {
    res.status(403).json({ success: false, error: 'Access denied. Super Admin permissions required.' });
    return;
  }
  next();
};
