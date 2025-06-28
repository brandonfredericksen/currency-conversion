import { Request } from 'express';

export interface User {
  id: string;
  name: string;
  email: string;
  api_key: string;
  created_at: string;
  is_active: number;
}

export interface ConversionResponse {
  success: boolean;
  data?: {
    from: string;
    to: string;
    amount: number;
    converted_amount: number;
    exchange_rate: number;
    timestamp: string;
    rate_last_updated: string;
  };
  error?: string;
}

export interface AuthenticatedRequest extends Request {
  authenticatedUser?: User;
}

export interface RateLimitInfo {
  currentCount: number;
  dailyLimit: number;
  isWeekend: boolean;
}

export interface RateLimitedRequest extends AuthenticatedRequest {
  rateLimitInfo?: RateLimitInfo;
}

export interface RateLimitResult {
  allowed: boolean;
  currentCount: number;
}

export interface ConversionResult {
  convertedAmount: number;
  exchangeRate: number;
  rateLastUpdated: string;
}

export type SupportedCurrency = string;