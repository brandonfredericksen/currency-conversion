import { Response, NextFunction } from 'express';
import { getUserByApiKeyStatement } from '../database.js';
import { User, AuthenticatedRequest } from '../types/index.js';

export const authenticateUser = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        success: false,
        error: {
          code: 'MISSING_AUTHORIZATION',
          message: 'Authorization header is required'
        }
      });
      return;
    }

    if (!authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_AUTH_FORMAT',
          message: 'Authorization header must start with "Bearer "'
        }
      });
      return;
    }

    const apiKey = authHeader.replace('Bearer ', '');

    if (!apiKey || apiKey.trim() === '') {
      res.status(401).json({
        success: false,
        error: {
          code: 'MISSING_API_KEY',
          message: 'API key is required'
        }
      });
      return;
    }

    const authenticatedUser = getUserByApiKeyStatement.get(apiKey) as User | undefined;

    if (!authenticatedUser) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_API_KEY',
          message: 'Invalid API key'
        }
      });
      return;
    }

    if (!authenticatedUser.is_active) {
      res.status(401).json({
        success: false,
        error: {
          code: 'USER_INACTIVE',
          message: 'User account is inactive'
        }
      });
      return;
    }

    req.authenticatedUser = authenticatedUser;
    next();

  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Internal authentication error'
      }
    });
  }
};