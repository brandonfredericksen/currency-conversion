export const testUser = {
    userId: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    name: "Test User",
    email: "test@example.com",
    apiKey: "550e8400-e29b-41d4-a716-446655440000"
};

export const SUPPORTED_CURRENCIES: { [currency: string]: number } = {
    USD: 2, // US Dollar, 2 decimal places
    EUR: 2, // Euro, 2 decimal places
    BTC: 8, // Bitcoin, 8 decimal places
    ETH: 8, // Ethereum, 8 decimal places
    SOL: 6, // Solana, 6 decimal places
    ADA: 6,  // Cardano, 6 decimal places
    DOGE: 8, // Dogecoin, 8 decimal places
};