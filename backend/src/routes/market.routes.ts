import { Router, Request, Response } from 'express';
import { HyperliquidService } from '../services/hyperliquid.service';
import { optionalAuth } from '../middleware/auth.middleware';
import { config } from '../config';

const router = Router();
const hyperliquidService = new HyperliquidService(config.hyperliquid);

// Public market data routes
router.get('/assets', async (req: Request, res: Response) => {
  try {
    const contexts = await hyperliquidService.getAssetContexts();
    res.json(contexts);
  } catch (error) {
    console.error('Get assets error:', error);
    res.status(500).json({ error: 'Failed to get asset contexts' });
  }
});

router.get('/assets/:coin', async (req: Request, res: Response) => {
  try {
    const { coin } = req.params;
    const snapshot = await hyperliquidService.getMarketSnapshot(coin);
    res.json(snapshot);
  } catch (error) {
    console.error('Get market snapshot error:', error);
    res.status(500).json({ error: 'Failed to get market snapshot' });
  }
});

router.get('/funding-rates', async (req: Request, res: Response) => {
  try {
    const fundingRates = await hyperliquidService.getFundingRates();
    res.json(fundingRates);
  } catch (error) {
    console.error('Get funding rates error:', error);
    res.status(500).json({ error: 'Failed to get funding rates' });
  }
});

// Protected user-specific routes
router.get('/account-summary', optionalAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as any;
    const walletAddress = req.query.wallet || authReq.user?.walletAddress;

    if (!walletAddress) {
      res.status(400).json({ error: 'Wallet address required' });
      return;
    }

    const summary = await hyperliquidService.getAccountSummary(walletAddress as string);
    res.json(summary);
  } catch (error) {
    console.error('Get account summary error:', error);
    res.status(500).json({ error: 'Failed to get account summary' });
  }
});

router.get('/user-fills', optionalAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as any;
    const walletAddress = req.query.wallet || authReq.user?.walletAddress;
    const limit = parseInt(req.query.limit as string) || 100;

    if (!walletAddress) {
      res.status(400).json({ error: 'Wallet address required' });
      return;
    }

    const fills = await hyperliquidService.getUserFills(walletAddress as string, limit);
    res.json(fills);
  } catch (error) {
    console.error('Get user fills error:', error);
    res.status(500).json({ error: 'Failed to get user fills' });
  }
});

router.get('/open-orders', optionalAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as any;
    const walletAddress = req.query.wallet || authReq.user?.walletAddress;

    if (!walletAddress) {
      res.status(400).json({ error: 'Wallet address required' });
      return;
    }

    const orders = await hyperliquidService.getOpenOrders(walletAddress as string);
    res.json(orders);
  } catch (error) {
    console.error('Get open orders error:', error);
    res.status(500).json({ error: 'Failed to get open orders' });
  }
});

router.get('/spot-balances', optionalAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as any;
    const walletAddress = req.query.wallet || authReq.user?.walletAddress;

    if (!walletAddress) {
      res.status(400).json({ error: 'Wallet address required' });
      return;
    }

    const balances = await hyperliquidService.getSpotBalances(walletAddress as string);
    res.json(balances);
  } catch (error) {
    console.error('Get spot balances error:', error);
    res.status(500).json({ error: 'Failed to get spot balances' });
  }
});

export default router;