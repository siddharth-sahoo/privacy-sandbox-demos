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
import {getTemplateVariables} from './utils.js';

const {EXTERNAL_PORT} = process.env;
export const DspRouter = express.Router();

// ************************************************************************
// HTTP handlers
// ************************************************************************
/** Iframe document used as context to join interest group. */
DspRouter.get(
  '/join-ad-interest-group.html',
  async (req: Request, res: Response) => {
    res.render(
      'dsp/join-ad-interest-group',
      getTemplateVariables(req.hostname, 'Join Ad Interest Group'),
    );
  },
);

/** Returns the interest group to join on advertiser page. */
DspRouter.get('/interest-group.json', async (req: Request, res: Response) => {
  const currHost = req.hostname;
  const advertiser = req.query.advertiser || currHost;
  console.log('Returning IG JSON: ', req.query);
  res.json({
    name: advertiser,
    owner: new URL(`https://${currHost}:${EXTERNAL_PORT}`),
    biddingLogicURL: new URL(
      `https://${currHost}:${EXTERNAL_PORT}/js/dsp/bidding-logic.js`,
    ),
    trustedBiddingSignalsURL: new URL(
      `https://${currHost}:${EXTERNAL_PORT}/dsp/bidding-signal.json`,
    ),
    trustedBiddingSignalsKeys: [
      'trustedBiddingSignalsKeys-1',
      'trustedBiddingSignalsKeys-2',
    ],
    // Daily update is not implemented yet.
    // updateURL: new URL(
    //  `https://${currHost}:${EXTERNAL_PORT}/dsp/daily-update-url`,
    // ),
    userBiddingSignals: {
      'user_bidding_signals': 'user_bidding_signals',
      ...req.query, // Copy query from request URL.
    },
    adSizes: {
      'medium-rectangle-default': {'width': '300px', 'height': '250px'},
    },
    sizeGroups: {
      'medium-rectangle': ['medium-rectangle-default'],
    },
    ads: [
      {
        renderURL: getRenderUrl(currHost, req.query),
        sizeGroup: 'medium-rectangle',
        metadata: {
          // Custom ad metadata defined by ad-tech.
          advertiser,
          'adType': 'image',
          'adSizes': [{'width': '300px', 'height': '250px'}],
        },
      },
    ],
  });
});

/** Simplified BYOS implementation for Key-Value Service. */
DspRouter.get('/bidding-signal.json', async (req: Request, res: Response) => {
  res.setHeader('X-Allow-FLEDGE', 'true');
  res.setHeader('X-fledge-bidding-signals-format-version', '2');
  const biddingSignals = {
    keys: {
      'key1': 'xxxxxxxx',
      'key2': 'yyyyyyyy',
    },
    perInterestGroupData: {
      'name1': {
        'priorityVector': {
          'signal1': 100,
          'signal2': 200,
        },
      },
    },
  }
  console.log('Returning trusted bidding signals: ', req.baseUrl, biddingSignals);
  res.json(biddingSignals);
});

// TODO: Implement
// DspRouter.get("/daily-update-url", async (req: Request, res: Response) => {
// })

/** Simple E2E Private Aggregation Demo */
DspRouter.get('/private-aggregation', (req: Request, res: Response) => {
  const bucket = req.query.bucket;
  const cloudEnv = req.query.cloudEnv;
  console.log(`${bucket}, ${cloudEnv}`);
  res.render('dsp/private-aggregation', {
    bucket: bucket,
    cloudEnv: cloudEnv,
  });
});

// ************************************************************************
// DSP helper functions
// ************************************************************************
/** Constructs render URL to use in Interest Groups. */
const getRenderUrl = (currHost: string, query: any): string => {
  if ('video' === query.adType) {
    return new URL(
      `https://${currHost}:${EXTERNAL_PORT}/html/video-ad-creative.html`,
    ).toString();
  } else {
    const advertiser = query.advertiser || currHost;
    const imageCreative = new URL(`https://${currHost}:${EXTERNAL_PORT}/ads`);
    imageCreative.searchParams.append('advertiser', advertiser);
    if (query.itemId) {
      imageCreative.searchParams.append('itemId', query.itemId);
    }
    const sizeMacro1 = 'adSize1={%AD_WIDTH%}x{%AD_HEIGHT%}';
    const sizeMacro2 = 'adSize2=${AD_WIDTH}x${AD_HEIGHT}';
    return `${imageCreative.toString()}&${sizeMacro1}&${sizeMacro2}`;
  }
};
