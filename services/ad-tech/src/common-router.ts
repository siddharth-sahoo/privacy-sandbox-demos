/*
 Copyright 2022 Google LLC

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

      https://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

import express, {NextFunction, Request, Response} from 'express';
import {getTemplateVariables} from './utils.js';

const {EXTERNAL_PORT, SHOP_HOST} = process.env;
export const CommonRouter = express.Router();

/** Set PS-related headers. */
CommonRouter.use((req: Request, res: Response, next: NextFunction) => {
  // Explicitly allow loading in fenced-frame.
  if (req.get('Sec-Fetch-Dest') === 'fencedframe') {
    res.setHeader('Supports-Loading-Mode', 'fenced-frame');
  }
  // Enable debug reports for Atribution Reporting.
  res.cookie('ar_debug', '1', {
    sameSite: 'none',
    secure: true,
    httpOnly: true,
  });
  // Enable CORS.
  if (req.headers.origin?.startsWith('https://privacy-sandbox-demos-')) {
    res.setHeader('Access-Control-Allow-Origin', req.headers['origin']);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  next();
});

/** Set PAAPI headers on static content. */
CommonRouter.use(
  express.static('src/public', {
    setHeaders: (res: Response, path: string) => {
      if (
        path.endsWith('bidding-logic.js') ||
        path.endsWith('decision-logic.js')) {
        return res.set('X-Allow-FLEDGE', 'true');
      }
      if (path.endsWith('/run-ad-auction.js')) {
        res.set('Supports-Loading-Mode', 'fenced-frame');
        res.set('Permissions-Policy', 'run-ad-auction=(*)');
      }
    },
  }),
);

// ************************************************************************
// HTTP handlers
// ************************************************************************
/** Index page, not commonly used in tests. */
CommonRouter.get('/', async (req: Request, res: Response) => {
  if (req.hostname.includes('ssp')) {
    res.render('ssp/index', getTemplateVariables(req.hostname));
  } else {
    res.render('dsp/index', getTemplateVariables(req.hostname));
  }
});

/** Used as render URL in interest groups. */
CommonRouter.get('/ads', async (req: Request, res: Response) => {
  const templateVariables = getAdTemplateVariables(req.hostname, req.query);
  console.log('Loading ad creative: ', templateVariables);
  res.render('ads', templateVariables);
});

// ************************************************************************
// Helper functions
// ************************************************************************
const getAdTemplateVariables = (currHost: string, query: any) => {
  // Initialize template variables.
  const advertiser = query.advertiser || currHost;
  let destination = new URL(`https://${advertiser}:${EXTERNAL_PORT}`).toString();
  let creative = new URL(`https://${advertiser}:${EXTERNAL_PORT}/ads`).toString();
  const registerSourceUrl = new URL(
    `https://${currHost}:${EXTERNAL_PORT}/register-source`,
  );
  registerSourceUrl.searchParams.append('advertiser', advertiser);

  // Load specific ad for SHOP advertiser.
  if (query.itemId && SHOP_HOST === advertiser) {
    destination = new URL(
      `https://${advertiser}:${EXTERNAL_PORT}/items/${query.itemId}`,
    ).toString();
    creative = new URL(
      `https://${advertiser}:${EXTERNAL_PORT}/ads/${query.itemId}`,
    ).toString();
    registerSourceUrl.searchParams.append('itemId', query.itemId);
  }

  // If advertiser is ad-tech itself, show static ad.
  if (currHost === advertiser) {
    creative = new URL(
      `https://${advertiser}:${EXTERNAL_PORT}/img/emoji_u1f4b0.svg`,
    ).toString();
  }

  return {
    title: `Your special ads from ${advertiser}`,
    destination,
    creative,
    registerSource: registerSourceUrl.toString(),
  }
};
