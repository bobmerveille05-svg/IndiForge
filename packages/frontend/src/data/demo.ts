/**
 * Demo OHLCV dataset for preview
 * EUR/USD-like data for testing indicators
 */

export interface OHLCV {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Generate 500 bars of sample OHLCV data
 * Simulates EUR/USD with realistic price movements
 */
export function generateDemoData(): OHLCV[] {
  const data: OHLCV[] = [];
  let basePrice = 1.0850;
  const startTime = new Date('2024-01-01').getTime();
  
  // Random seed for reproducibility
  let seed = 12345;
  const random = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  for (let i = 0; i < 500; i++) {
    // Random walk with trend
    const trend = Math.sin(i / 50) * 0.001; // Subtle trend
    const volatility = 0.0005 + random() * 0.0008;
    const change = (random() - 0.5) * volatility * 2 + trend;
    
    const open = basePrice;
    const close = basePrice * (1 + change);
    
    // High/low based on volatility
    const range = Math.abs(close - open) + random() * volatility;
    const high = Math.max(open, close) + range * random();
    const low = Math.min(open, close) - range * random();
    
    // Random volume between 1000 and 10000
    const volume = 1000 + Math.floor(random() * 9000);
    
    data.push({
      time: startTime + i * 3600000, // Hourly bars
      open: Math.round(open * 100000) / 100000,
      high: Math.round(high * 100000) / 100000,
      low: Math.round(low * 100000) / 100000,
      close: Math.round(close * 100000) / 100000,
      volume,
    });
    
    basePrice = close;
  }
  
  return data;
}

/**
 * Get a subset of the demo data (for faster preview)
 */
export function getDemoData(count: number = 100): OHLCV[] {
  const full = generateDemoData();
  return full.slice(-count);
}

// Export sample data directly
export const sampleOHLCV: OHLCV[] = generateDemoData();

export default sampleOHLCV;