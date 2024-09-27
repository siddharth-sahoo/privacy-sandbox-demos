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

export const dspRouter = express.Router();

/** Iframe document used as context to join interest group. */
dspRouter.get(
  '/join-ad-interest-group.html',
  async (req: Request, res: Response) => {
    res.render(
      'dsp/join-ad-interest-group',
      getTemplateVariables(req.hostname, 'Join Ad Interest Group'),
    );
  },
);

/** Returns the interest group to join on advertiser page. */
dspRouter.get('/interest-group.json', async (req: Request, res: Response) => {
  const {advertiser, itemId, adType} = req.query;
  const currHost = req.hostname;
  if (!advertiser || !itemId) {
    return res.sendStatus(400);
  }
  console.log('Returning IG JSON: ', req.query);
  res.json({
    'name': advertiser,
    'owner': new URL(`https://${currHost}:${EXTERNAL_PORT}`),
    // x-allow-fledge: true
    'biddingLogicURL': new URL(
      `https://${currHost}:${EXTERNAL_PORT}/js/dsp/bidding-logic.js`,
    ),
    'trustedBiddingSignalsURL': new URL(
      `https://${currHost}:${EXTERNAL_PORT}/dsp/bidding-signal.json`,
    ),
    'trustedBiddingSignalsKeys': [
      'trustedBiddingSignalsKeys-1',
      'trustedBiddingSignalsKeys-2',
    ],
    // Daily update is not implemented yet.
    // 'updateURL': new URL(
    //  `https://${currHost}:${EXTERNAL_PORT}/dsp/daily-update-url`,
    // ),
    'userBiddingSignals': {
      'user_bidding_signals': 'user_bidding_signals',
    },
    'adSizes': {
      'medium-rectangle-default': {'width': '300px', 'height': '250px'},
    },
    'sizeGroups': {
      'medium-rectangle': ['medium-rectangle-default'],
    },
    'ads': [
      {
        'renderURL': getRenderUrl(
          currHost,
          advertiser as string,
          itemId as string,
          adType as string,
        ),
        'sizeGroup': 'medium-rectangle',
        'metadata': {
          'type': advertiser,
          'adType': 'image',
          'adSizes': [{'width': '300px', 'height': '250px'}],
        },
      },
    ],
  });
});

/** Simplified BYOS implementation for Key-Value Service. */
dspRouter.get('/bidding-signal.json', async (req: Request, res: Response) => {
  console.log('Returning trusted bidding signals: ', req.originalUrl);
  res.setHeader('X-Allow-FLEDGE', 'true');
  res.setHeader('X-fledge-bidding-signals-format-version', '2');
  res.json({
    'keys': {
      'key1': 'xxxxxxxx',
      'key2': 'yyyyyyyy',
    },
    'perInterestGroupData': {
      'name1': {
        'priorityVector': {
          'signal1': 100,
          'signal2': 200,
        },
      },
    },
  });
});

// TODO: Implement
// dspRouter.get("/daily-update-url", async (req: Request, res: Response) => {
// })

/** Constructs render URL to use in Interest Groups. */
const getRenderUrl = (
  currHost: string,
  advertiser: string,
  itemId: string,
  adType: string,
): string => {
  if (adType === 'video') {
    return new URL(
      `https://${currHost}:${EXTERNAL_PORT}/html/video-ad-creative.html`,
    ).toString();
  } else {
    const imageCreative = new URL(`https://${currHost}:${EXTERNAL_PORT}/ads`);
    imageCreative.searchParams.append('advertiser', advertiser);
    imageCreative.searchParams.append('itemId', itemId);
    const sizeMacro1 = 'adSize1={%AD_WIDTH%}x{%AD_HEIGHT%}';
    const sizeMacro2 = 'adSize2=${AD_WIDTH}x${AD_HEIGHT}';
    return `${imageCreative.toString()}&${sizeMacro1}&${sizeMacro2}`;
  }
};

/** Simple E2E Private Aggregation Demo */
dspRouter.get('/private-aggregation', (req: Request, res: Response) => {
  const bucket = req.query.bucket;
  const cloudEnv = req.query.cloudEnv;
  console.log(`${bucket}, ${cloudEnv}`);
  res.render('dsp/private-aggregation', {
    bucket: bucket,
    cloudEnv: cloudEnv,
  });
});
