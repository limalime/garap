// Revenue Calculation Agent — CoinGecko price conversion + revenue reads.
//
// Exchange rates come from CoinGecko's free/Demo tier (/simple/price) and are
// cached in AsyncStorage with a 15-minute TTL; on API failure we fall back to
// the last cached rates (even if stale), then to static fiat rates.
//
// Revenue aggregation itself is authoritative on the server: a Postgres trigger
// maintains user_revenue + revenue_history + win_rate whenever a bounty becomes
// 'Won' (see supabase/migrations). The functions here READ those tables; the
// client's only write-side responsibility is computing prizeInUSD at win time.

import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

import type {
  BountyCategory,
  ExchangeRates,
  PrizeUnit,
  RevenueHistoryEntry,
  RevenueStats,
} from '@/src/types';
import { BOUNTY_CATEGORIES, PRIZE_UNITS } from '@/src/types';

import { supabase } from './supabase';

const COINGECKO_BASE =
  process.env.EXPO_PUBLIC_COINGECKO_API_URL ?? 'https://api.coingecko.com/api/v3';

// Demo-tier API key (optional) — sent via the x-cg-demo-api-key header to lift
// the anonymous rate limit. https://docs.coingecko.com/reference/setting-up-your-api-key
const COINGECKO_API_KEY = process.env.EXPO_PUBLIC_COINGECKO_API_KEY;
const apiKeyHeader = COINGECKO_API_KEY
  ? { 'x-cg-demo-api-key': COINGECKO_API_KEY }
  : undefined;

// CoinGecko coin IDs for the crypto units we support.
const COINGECKO_IDS: Partial<Record<PrizeUnit, string>> = {
  ETH: 'ethereum',
  BTC: 'bitcoin',
  SOL: 'solana',
  USDC: 'usd-coin',
  USDT: 'tether',
};

// Fiat rates (CoinGecko's crypto price endpoint doesn't quote these). IDR is an
// approximation; swap for a forex source if precision matters.
const STATIC_USD_RATES: Partial<Record<PrizeUnit, number>> = {
  USD: 1,
  IDR: 1 / 16000,
};

// --------------------------------------------------------------------------
// Exchange-rate cache (15-minute TTL)
// --------------------------------------------------------------------------
const RATES_CACHE_KEY = 'garap.exchangeRates.v1';
const CACHE_TTL_MS = 15 * 60 * 1000;

interface RatesCache {
  rates: ExchangeRates;
  fetchedAt: number;
}

function emptyRates(): ExchangeRates {
  return PRIZE_UNITS.reduce((acc, unit) => {
    acc[unit] = STATIC_USD_RATES[unit] ?? 0;
    return acc;
  }, {} as ExchangeRates);
}

async function getCachedRates(): Promise<RatesCache | null> {
  try {
    const raw = await AsyncStorage.getItem(RATES_CACHE_KEY);
    return raw ? (JSON.parse(raw) as RatesCache) : null;
  } catch {
    return null;
  }
}

/** Persist exchange rates with the current timestamp. */
export async function cacheExchangeRates(rates: ExchangeRates): Promise<void> {
  try {
    const entry: RatesCache = { rates, fetchedAt: Date.now() };
    await AsyncStorage.setItem(RATES_CACHE_KEY, JSON.stringify(entry));
  } catch (err) {
    console.warn('[crypto] Failed to cache exchange rates:', err);
  }
}

/**
 * Return USD-per-unit for every supported currency. Uses the 15-minute cache
 * unless `force` is set; falls back to stale cache, then static fiat, on error.
 */
export async function getExchangeRates(force = false): Promise<ExchangeRates> {
  const cached = await getCachedRates();
  if (!force && cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.rates;
  }

  const ids = Object.values(COINGECKO_IDS).join(',');
  try {
    const { data } = await axios.get(`${COINGECKO_BASE}/simple/price`, {
      params: { ids, vs_currencies: 'usd' },
      headers: apiKeyHeader,
      timeout: 10000,
    });

    const rates = emptyRates();
    for (const [unit, id] of Object.entries(COINGECKO_IDS) as [PrizeUnit, string][]) {
      rates[unit] = data?.[id]?.usd ?? cached?.rates?.[unit] ?? 0;
    }
    await cacheExchangeRates(rates);
    return rates;
  } catch (err) {
    console.warn('[crypto] Exchange rate fetch failed, using fallback:', err);
    return cached?.rates ?? emptyRates();
  }
}

/** Convert an amount in `currency` to USD using the latest (cached) rates. */
export async function convertToUSD(amount: number, currency: PrizeUnit): Promise<number> {
  const rates = await getExchangeRates();
  const rate = rates[currency] ?? 0;
  return amount * rate;
}

// --------------------------------------------------------------------------
// Revenue reads (server is the source of truth; see file header)
// --------------------------------------------------------------------------
function zeroByCategory(): Record<BountyCategory, number> {
  return BOUNTY_CATEGORIES.reduce((acc, c) => {
    acc[c] = 0;
    return acc;
  }, {} as Record<BountyCategory, number>);
}

/** Win percentage = won / (won + lost) * 100, computed from the user's bounties. */
export async function calculateWinRate(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('bounties')
    .select('status')
    .eq('user_id', userId)
    .is('deleted_at', null);
  if (error) throw error;

  const rows = data ?? [];
  const won = rows.filter((r) => r.status === 'Won').length;
  const lost = rows.filter((r) => r.status === 'Lost').length;
  const decided = won + lost;
  return decided === 0 ? 0 : Math.round((won / decided) * 10000) / 100;
}

/**
 * Full revenue breakdown: total USD, per-category totals, win rate, and the
 * won-bounty history log. Reads the trigger-maintained user_revenue +
 * revenue_history tables.
 */
export async function getRevenueStats(userId: string): Promise<RevenueStats> {
  const [{ data: revenueRow }, { data: historyRows, error: historyErr }] = await Promise.all([
    supabase.from('user_revenue').select('*').eq('user_id', userId).maybeSingle(),
    supabase
      .from('revenue_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
  ]);
  if (historyErr) throw historyErr;

  const history: RevenueHistoryEntry[] = (historyRows ?? []).map((r) => ({
    date: r.created_at,
    amount: Number(r.amount_usd),
    bountyId: r.bounty_id ?? '',
    category: (r.category ?? 'Other') as BountyCategory,
  }));

  const revenueByCategory = zeroByCategory();
  for (const entry of history) {
    revenueByCategory[entry.category] = (revenueByCategory[entry.category] ?? 0) + entry.amount;
  }

  return {
    totalRevenueUSD: Number(revenueRow?.total_revenue_usd ?? 0),
    revenueByCategory,
    winRate: Number(revenueRow?.win_rate ?? 0),
    history,
    wonCount: history.length,
    lastUpdated: revenueRow?.last_updated ?? new Date().toISOString(),
  };
}

/**
 * Refresh the authoritative revenue snapshot from the server. Persistence is
 * automatic (the DB trigger updates user_revenue/revenue_history/win_rate when a
 * bounty is marked 'Won' with its prizeInUSD), so this simply re-reads the
 * aggregated result — call it after a win to sync the dashboard.
 */
export async function updateUserRevenue(userId: string): Promise<RevenueStats> {
  return getRevenueStats(userId);
}
