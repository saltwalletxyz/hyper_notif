"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const hyperliquid_service_1 = require("../services/hyperliquid.service");
const auth_middleware_1 = require("../middleware/auth.middleware");
const config_1 = require("../config");
const router = (0, express_1.Router)();
const hyperliquidService = new hyperliquid_service_1.HyperliquidService(config_1.config.hyperliquid);
// Public market data routes
router.get('/assets', async (req, res) => {
    try {
        const contexts = await hyperliquidService.getAssetContexts();
        res.json(contexts);
    }
    catch (error) {
        console.error('Get assets error:', error);
        res.status(500).json({ error: 'Failed to get asset contexts' });
    }
});
router.get('/assets/:coin', async (req, res) => {
    try {
        const { coin } = req.params;
        const snapshot = await hyperliquidService.getMarketSnapshot(coin);
        res.json(snapshot);
    }
    catch (error) {
        console.error('Get market snapshot error:', error);
        res.status(500).json({ error: 'Failed to get market snapshot' });
    }
});
router.get('/funding-rates', async (req, res) => {
    try {
        const fundingRates = await hyperliquidService.getFundingRates();
        res.json(fundingRates);
    }
    catch (error) {
        console.error('Get funding rates error:', error);
        res.status(500).json({ error: 'Failed to get funding rates' });
    }
});
// Protected user-specific routes
router.get('/account-summary', auth_middleware_1.optionalAuth, async (req, res) => {
    try {
        const authReq = req;
        const walletAddress = req.query.wallet || authReq.user?.walletAddress;
        if (!walletAddress) {
            res.status(400).json({ error: 'Wallet address required' });
            return;
        }
        const summary = await hyperliquidService.getAccountSummary(walletAddress);
        res.json(summary);
    }
    catch (error) {
        console.error('Get account summary error:', error);
        res.status(500).json({ error: 'Failed to get account summary' });
    }
});
router.get('/user-fills', auth_middleware_1.optionalAuth, async (req, res) => {
    try {
        const authReq = req;
        const walletAddress = req.query.wallet || authReq.user?.walletAddress;
        const limit = parseInt(req.query.limit) || 100;
        if (!walletAddress) {
            res.status(400).json({ error: 'Wallet address required' });
            return;
        }
        const fills = await hyperliquidService.getUserFills(walletAddress, limit);
        res.json(fills);
    }
    catch (error) {
        console.error('Get user fills error:', error);
        res.status(500).json({ error: 'Failed to get user fills' });
    }
});
router.get('/open-orders', auth_middleware_1.optionalAuth, async (req, res) => {
    try {
        const authReq = req;
        const walletAddress = req.query.wallet || authReq.user?.walletAddress;
        if (!walletAddress) {
            res.status(400).json({ error: 'Wallet address required' });
            return;
        }
        const orders = await hyperliquidService.getOpenOrders(walletAddress);
        res.json(orders);
    }
    catch (error) {
        console.error('Get open orders error:', error);
        res.status(500).json({ error: 'Failed to get open orders' });
    }
});
router.get('/spot-balances', auth_middleware_1.optionalAuth, async (req, res) => {
    try {
        const authReq = req;
        const walletAddress = req.query.wallet || authReq.user?.walletAddress;
        if (!walletAddress) {
            res.status(400).json({ error: 'Wallet address required' });
            return;
        }
        const balances = await hyperliquidService.getSpotBalances(walletAddress);
        res.json(balances);
    }
    catch (error) {
        console.error('Get spot balances error:', error);
        res.status(500).json({ error: 'Failed to get spot balances' });
    }
});
exports.default = router;
