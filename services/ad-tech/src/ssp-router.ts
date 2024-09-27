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

const {DSP_HOST, DSP_A_HOST, DSP_B_HOST, EXTERNAL_PORT} = process.env;
export const sspRouter = express.Router();

sspRouter.get('/run-ad-auction.html', async (req, res) => {
  res.render('ssp/run-ad-auction');
});

sspRouter.get('/auction-config.json', async (req, res) => {
  const {adType} = req.query;
  const sspOrigin = new URL(
    `https://${req.hostname}:${EXTERNAL_PORT}`,
  ).toString();
  const [dspOrigin, dspAOrigin, dspBOrigin] = [
    new URL(`https://${DSP_HOST}:${EXTERNAL_PORT}`).toString(),
    new URL(`https://${DSP_A_HOST}:${EXTERNAL_PORT}`).toString(),
    new URL(`https://${DSP_B_HOST}:${EXTERNAL_PORT}`).toString(),
  ];
  const auctionConfig = {
    'seller': sspOrigin,
    'decisionLogicURL': `${sspOrigin}js/ssp/decision-logic.js`,
    'interestGroupBuyers': [dspOrigin, dspAOrigin, dspBOrigin],
    'auctionSignals': {
      'auction_signals': 'auction_signals',
    },
    'sellerSignals': {
      'seller_signals': 'seller_signals',
    },
    'perBuyerSignals': {
      [dspOrigin]: {'per_buyer_signals': 'per_buyer_signals'},
      [dspAOrigin]: {'per_buyer_signals': 'per_buyer_signals'},
      [dspBOrigin]: {'per_buyer_signals': 'per_buyer_signals'},
    },
    // Needed for size macro replacements.
    'requestedSize': {'width': '300px', 'height': '250px'},
    // If set to true, runAdAuction returns a FencedFrameConfig.
    // Video ads are only supported with iframes.
    'resolveToConfig': adType !== 'video',
  };
  console.log('Returning auction config: ', {auctionConfig});
  res.json(auctionConfig);
});
