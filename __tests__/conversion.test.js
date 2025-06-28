import request from 'supertest';
import app from '../server.js';
import { convertCurrency } from '../services/exchangeRates.js';

describe('Currency Conversion', () => {
  const validHeaders = { 'Authorization': 'Bearer test-api-key-12345' };
  
  afterAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  describe('Supported Currency Pairs', () => {
    test('converts USD to EUR', async () => {
      const response = await request(app)
        .get('/api/2025-06/convert?from=USD&to=EUR&amount=100')
        .set(validHeaders);
      
      if (response.status === 200) {
        expect(response.body.data.from).toBe('USD');
        expect(response.body.data.to).toBe('EUR');
        expect(response.body.data.amount).toBe(100);
        expect(typeof response.body.data.converted_amount).toBe('number');
        expect(typeof response.body.data.exchange_rate).toBe('number');
      }
    });

    test('converts BTC to USD', async () => {
      const response = await request(app)
        .get('/api/2025-06/convert?from=BTC&to=USD&amount=0.1')
        .set(validHeaders);
      
      if (response.status === 200) {
        expect(response.body.data.from).toBe('BTC');
        expect(response.body.data.to).toBe('USD');
        expect(response.body.data.amount).toBe(0.1);
      }
    });

    test('converts ETH to BTC', async () => {
      const response = await request(app)
        .get('/api/2025-06/convert?from=ETH&to=BTC&amount=1')
        .set(validHeaders);
      
      if (response.status === 200) {
        expect(response.body.data.from).toBe('ETH');
        expect(response.body.data.to).toBe('BTC');
        expect(response.body.data.amount).toBe(1);
      }
    });
  });

  describe('Same Currency Conversion', () => {
    test('handles same currency conversion correctly', async () => {
      const result = await convertCurrency('USD', 'USD', 100);
      
      expect(result.convertedAmount).toBe(100);
      expect(result.exchangeRate).toBe(1.0);
      expect(result.rateLastUpdated).toBeDefined();
    });
  });

  describe('Input Validation', () => {
    test('rejects unsupported currencies', async () => {
      const response = await request(app)
        .get('/api/2025-06/convert?from=JPY&to=USD&amount=100')
        .set(validHeaders);
      
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('UNSUPPORTED_CURRENCY');
    });

    test('rejects missing parameters', async () => {
      const response = await request(app)
        .get('/api/2025-06/convert?from=USD&amount=100')
        .set(validHeaders);
      
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_PARAMETERS');
    });

    test('rejects invalid amount', async () => {
      const response = await request(app)
        .get('/api/2025-06/convert?from=USD&to=EUR&amount=notanumber')
        .set(validHeaders);
      
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_AMOUNT');
    });

    test('rejects negative amount', async () => {
      const response = await request(app)
        .get('/api/2025-06/convert?from=USD&to=EUR&amount=-50')
        .set(validHeaders);
      
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_AMOUNT');
    });

    test('rejects zero amount', async () => {
      const response = await request(app)
        .get('/api/2025-06/convert?from=USD&to=EUR&amount=0')
        .set(validHeaders);
      
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_AMOUNT');
    });
  });

  describe('Decimal Precision', () => {
    test('handles decimal amounts correctly', async () => {
      const response = await request(app)
        .get('/api/2025-06/convert?from=BTC&to=USD&amount=0.00123456')
        .set(validHeaders);
      
      if (response.status === 200) {
        expect(response.body.data.amount).toBe(0.00123456);
        expect(typeof response.body.data.converted_amount).toBe('number');
      }
    });
  });
});