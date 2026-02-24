import type { Request, Response } from 'express';
import * as authService from '../services/auth.service';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export async function getAuthUrl(req: Request, res: Response) {
  const redirectUri = req.query.redirect_uri as string || `${req.protocol}://${req.get('host')}/api/v1/auth/callback`;
  const url = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${env.GOOGLE_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent('openid email profile https://www.googleapis.com/auth/gmail.modify')}` +
    `&access_type=offline` +
    `&prompt=consent`;

  res.json({ success: true, data: { url } });
}

export async function handleCallback(req: Request, res: Response) {
  try {
    const { code, redirectUri } = req.body;
    if (!code) {
      res.status(400).json({ success: false, error: 'Missing authorization code' });
      return;
    }

    const tokens = await authService.exchangeCodeForTokens(code, redirectUri);
    const userInfo = await authService.getGoogleUserInfo(tokens.access_token!);
    const account = await authService.findOrCreateAccount(userInfo, tokens);
    const jwtTokens = authService.generateTokens(account);

    res.json({
      success: true,
      data: {
        accessToken: jwtTokens.accessToken,
        refreshToken: jwtTokens.refreshToken,
        account: {
          id: account.id,
          email: account.email,
          name: account.name,
          pictureUrl: account.pictureUrl,
        },
      },
    });
  } catch (error) {
    logger.error({ error }, 'Auth callback failed');
    res.status(500).json({ success: false, error: 'Authentication failed' });
  }
}

export async function refreshToken(req: Request, res: Response) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ success: false, error: 'Missing refresh token' });
      return;
    }

    const payload = authService.verifyRefreshToken(refreshToken);
    const newTokens = authService.generateTokens({ id: payload.accountId, email: payload.email });

    res.json({
      success: true,
      data: { accessToken: newTokens.accessToken, refreshToken: newTokens.refreshToken },
    });
  } catch {
    res.status(401).json({ success: false, error: 'Invalid refresh token' });
  }
}

export async function getMe(req: Request, res: Response) {
  res.json({ success: true, data: req.auth });
}
