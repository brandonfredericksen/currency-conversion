import { getUserByApiKeyStatement } from '../database.js';

const authenticateUser = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'MISSING_AUTHORIZATION',
          message: 'Authorization header is required'
        }
      });
    }

    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_AUTH_FORMAT',
          message: 'Authorization header must start with "Bearer "'
        }
      });
    }

    const apiKey = authHeader.replace('Bearer ', '');

    if (!apiKey || apiKey.trim() === '') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'MISSING_API_KEY',
          message: 'API key is required'
        }
      });
    }

    const authenticatedUser = getUserByApiKeyStatement.get(apiKey);

    if (!authenticatedUser) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_API_KEY',
          message: 'Invalid API key'
        }
      });
    }

    if (!authenticatedUser.is_active) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_INACTIVE',
          message: 'User account is inactive'
        }
      });
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

export { authenticateUser };