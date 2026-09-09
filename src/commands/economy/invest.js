import { emoji as e } from '../../config/config.js';
import { getUser, addCoins, removeCoins } from '../../database/database.js';
import { formatCoins, checkEconCooldown } from './_utils.js';
import { resolveSender, jid } from '../../utils/utils.js';

/** @type {Record<string, { name: string, basePrice: number, volatility: number }>} */
const TICKERS = {
  sonic: { name: 'Sonic Transit ($SONIC)', basePrice: 100, volatility: 0.35 },
  ring: { name: 'Golden Ring ETF ($RING)', basePrice: 50, volatility: 0.2 },
  chaos: { name: 'Chaos Tech ($CHAOS)', basePrice: 250, volatility: 0.5 },
  egg: { name: 'Eggman Robotics ($EGG)', basePrice: 75, volatility: 0.4 },
};

/**
 * Deterministic cyclical price calculator based on 15-minute time windows
 * @param {string} tickerKey
 * @returns {{ currentPrice: number, changePercent: number }}
 */
const getTickerPrice = (tickerKey) => {
  const stock = TICKERS[tickerKey];
  if (!stock) return { currentPrice: 100, changePercent: 0 };

  const now = Date.now();
  const timeBlock = Math.floor(now / (15 * 60 * 1000));
  const seed = (timeBlock * 9301 + 49297) % 233280;
  const pseudoRand = seed / 233280;

  const cycle = Math.sin(timeBlock / 4 + tickerKey.length);
  const fluctuation = (cycle * 0.5 + (pseudoRand - 0.5)) * stock.volatility;

  const currentPrice = Math.max(10, Math.round(stock.basePrice * (1 + fluctuation)));
  const changePercent = parseFloat((fluctuation * 100).toFixed(1));

  return { currentPrice, changePercent };
};

/** @type {Map<string, Record<string, number>>} */
const userPortfolios = new Map();

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['invest'],
  desc: 'Trade virtual stocks and crypto in a live fluctuating market',

  run: async ({ text, sonic, msg }, args) => {
    const sender = resolveSender(msg);
    const userId = jid.fromUser(sender);
    const action = args[0]?.toLowerCase();

    if (!action || action === 'market' || action === 'board' || action === 'list') {
      const rows = Object.entries(TICKERS).map(([key, item]) => {
        const { currentPrice, changePercent } = getTickerPrice(key);
        const arrow = changePercent >= 0 ? '📈 +' : '📉 ';
        return `┃ ${item.name}\n┃   Price: 🪙 *${formatCoins(currentPrice)}* (${arrow}${changePercent}%)`;
      });

      return text(
        `
╭━━━ 📊 *STOCK EXCHANGE* ━━━╮
┃
${rows.join('\n┃\n')}
┃
┃ Commands:
┃ • !invest buy <ticker> <shares>
┃ • !invest sell <ticker> <shares>
┃ • !invest portfolio
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`.trim(),
      );
    }

    if (action === 'portfolio' || action === 'holdings') {
      const portfolio = userPortfolios.get(userId) || {};
      const entries = Object.entries(portfolio).filter(([, shares]) => shares > 0);

      if (!entries.length) {
        return text(
          `
╭━━━ 💼 *YOUR PORTFOLIO* ━━━╮
┃ ${e.info} You don't own any stock shares yet!
┃ Check available stocks: !invest market
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`.trim(),
        );
      }

      let totalVal = 0;
      const rows = entries.map(([ticker, shares]) => {
        const { currentPrice } = getTickerPrice(ticker);
        const value = currentPrice * shares;
        totalVal += value;
        return `┃ • *${ticker.toUpperCase()}*: ${shares} shares (🪙 ${formatCoins(value)})`;
      });

      return text(
        `
╭━━━ 💼 *YOUR PORTFOLIO* ━━━╮
┃
${rows.join('\n')}
┃
┃ 💰 Total Portfolio Value: *${formatCoins(totalVal)}*
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`.trim(),
      );
    }

    if (action === 'buy') {
      const ticker = args[1]?.toLowerCase().replace('$', '');
      const stock = TICKERS[ticker ?? ''];

      if (!stock) {
        return text(`${e.cross} Invalid stock ticker! Use !invest market to see tickers.`);
      }

      const shares = parseInt(args[2] ?? '1', 10);
      if (isNaN(shares) || shares <= 0) {
        return text(
          `${e.cross} Specify a valid number of shares to buy! Example: !invest buy ${ticker} 5`,
        );
      }

      if (!(await checkEconCooldown(sonic, msg, 'invest_trade', 3000))) return;

      const { currentPrice } = getTickerPrice(ticker ?? '');
      const totalCost = currentPrice * shares;

      const user = getUser(sender);
      if (!user || user.balance < totalCost) {
        return text(
          `${e.cross} Insufficient funds! ${shares} shares cost ${formatCoins(totalCost)} coins.`,
        );
      }

      removeCoins(sender, totalCost);

      const portfolio = userPortfolios.get(userId) || {};
      portfolio[ticker ?? ''] = (portfolio[ticker ?? ''] || 0) + shares;
      userPortfolios.set(userId, portfolio);

      const updated = getUser(sender);

      return text(
        `
╭━━━ 📈 *SHARES PURCHASED* ━━━╮
┃ Stock: *${stock.name}*
┃ Bought: *${shares}* shares @ 🪙 ${formatCoins(currentPrice)}/share
┃ Total Cost: *-${formatCoins(totalCost)}*
┃
┃ ${e.coin} Balance: *${formatCoins(updated?.balance ?? 0)}*
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`.trim(),
      );
    }

    if (action === 'sell') {
      const ticker = args[1]?.toLowerCase().replace('$', '');
      const stock = TICKERS[ticker ?? ''];

      if (!stock) {
        return text(`${e.cross} Invalid stock ticker! Use !invest market to see tickers.`);
      }

      const portfolio = userPortfolios.get(userId) || {};
      const ownedShares = portfolio[ticker ?? ''] || 0;

      if (ownedShares <= 0) {
        return text(`${e.cross} You don't own any shares of ${ticker?.toUpperCase()}!`);
      }

      const countToken = args[2]?.toLowerCase();
      const shares = countToken === 'all' ? ownedShares : parseInt(countToken ?? '1', 10);

      if (isNaN(shares) || shares <= 0) {
        return text(`${e.cross} Specify shares to sell! Example: !invest sell ${ticker} 2 or all`);
      }

      if (shares > ownedShares) {
        return text(`${e.cross} You only own ${ownedShares} shares of ${ticker?.toUpperCase()}!`);
      }

      if (!(await checkEconCooldown(sonic, msg, 'invest_trade', 3000))) return;

      const { currentPrice } = getTickerPrice(ticker ?? '');
      const totalEarnings = currentPrice * shares;

      portfolio[ticker ?? ''] = ownedShares - shares;
      userPortfolios.set(userId, portfolio);

      const newBalance = addCoins(sender, totalEarnings);

      return text(
        `
╭━━━ 📉 *SHARES SOLD* ━━━╮
┃ Stock: *${stock.name}*
┃ Sold: *${shares}* shares @ 🪙 ${formatCoins(currentPrice)}/share
┃ Proceeds: *+${formatCoins(totalEarnings)}*
┃
┃ ${e.coin} Balance: *${formatCoins(newBalance ?? 0)}*
╰━━━━━━━━━━━━━━━━━━━━━━━━╯`.trim(),
      );
    }

    return text(
      `${e.info} Usage: !invest market | !invest buy <ticker> <shares> | !invest sell <ticker> <shares> | !invest portfolio`,
    );
  },
};
