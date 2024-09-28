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

import express, {Request, Response} from 'express';

export const SspRouter = express.Router();

const {DSP_HOST, DSP_A_HOST, DSP_B_HOST, EXTERNAL_PORT} = process.env;
const [dspOrigin, dspAOrigin, dspBOrigin] = [
  new URL(`https://${DSP_HOST}:${EXTERNAL_PORT}`).toString(),
  new URL(`https://${DSP_A_HOST}:${EXTERNAL_PORT}`).toString(),
  new URL(`https://${DSP_B_HOST}:${EXTERNAL_PORT}`).toString(),
];

// ************************************************************************
// HTTP handlers
// ************************************************************************
/** Iframe document used as context to run PAAPI auction. */
SspRouter.get('/run-ad-auction.html', async (req: Request, res: Response) => {
  res.render('ssp/run-ad-auction');
});

/** Returns the PAAPI auction config. */
SspRouter.get('/auction-config.json', async (req: Request, res: Response) => {
  const sspOrigin = new URL(
    `https://${req.hostname}:${EXTERNAL_PORT}`,
  ).toString();
  // Select ad type based on URL query.
  const {adType} = req.query || 'display';
  /* If `adType` is `video`, set `resolveToConfig` to `false`. This is because
   * video ads are only supported with iframes. If `resolveToConfig` is set to
   * `true`, `runAdAuction()` returns a `FencedFrameConfig`, which can only be
   * rendered in FencedFrames and not iframes.
   */
  const resolveToConfig = adType !== 'video';
  const auctionConfig = {
    seller: sspOrigin,
    decisionLogicURL: `${sspOrigin}js/ssp/decision-logic.js`,
    interestGroupBuyers: [dspOrigin, dspAOrigin, dspBOrigin],
    auctionSignals: {
      'auction_signals': 'auction_signals',
      adType,
      ...req.query, // Copy signals from request query.
    },
    sellerSignals: {
      'seller_signals': 'seller_signals',
    },
    perBuyerSignals: {
      [dspOrigin]: {'per_buyer_signals': 'per_buyer_signals'},
      [dspAOrigin]: {'per_buyer_signals': 'per_buyer_signals'},
      [dspBOrigin]: {'per_buyer_signals': 'per_buyer_signals'},
    },
    // Needed for size macro replacements.
    requestedSize: {'width': '300px', 'height': '250px'},
    resolveToConfig,
  };
  console.log('Returning auction config: ', {auctionConfig});
  res.json(auctionConfig);
});
