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
import {HOSTNAME} from '../../lib/constants.js';
import {KeyValueStore} from '../../controllers/key-value-store.js';

/**
 * This router is responsible for handling requests to retrieve realtime
 * bidding signals for on-device Protected Audience auctions. In that, this is
 * a simplified Bring-Your-Own-Server (BYOS) implementation of the Key - Value
 * Server for ad buyers.
 *
 * Path: /dsp/realtime-signals/
 */
export const BiddingSignalsRouter = express.Router();

// ************************************************************************
// BYOS implementation of Key - Value store
// ************************************************************************
const trustedBiddingSignalStore = new KeyValueStore(
  /* defaultValues= */ [
    ['isActive', 'true'],
    ['minBid', '3.5'],
    ['maxBid', '4.5'],
    ['multiplier', '1.1'],
  ],
);

// ************************************************************************
// HTTP handlers
// ************************************************************************
/** Simplified BYOS implementation for Key-Value Service. */
BiddingSignalsRouter.get(
  '/bidding-signal.json',
  async (req: Request, res: Response) => {
    const publisher = req.query.hostname;
    const queryKeys = req.query.keys?.toString().split(',');
    const signalsFromKeyValueStore = trustedBiddingSignalStore.getMultiple(
      queryKeys!,
    );
    console.log('KV BYOS', {publisher, queryKeys});
    res.setHeader('X-Allow-FLEDGE', 'true');
    res.setHeader('X-fledge-bidding-signals-format-version', '2');
    const biddingSignals = {
      keys: {...signalsFromKeyValueStore},
      perInterestGroupData: {
        'name1': {
          'priorityVector': {
            'signal1': 100,
            'signal2': 200,
          },
        },
      },
    };
    console.log('Returning trusted bidding signals: ', {
      url: `${req.baseUrl}${req.path}`,
      biddingSignals,
    });
    res.json(biddingSignals);
  },
);

// ************************************************************************
// HTTP endpoints used for demonstration purposes
// ************************************************************************
/** Adds values in query parameters to Key Value Store. */
BiddingSignalsRouter.get(
  '/set-bidding-signal.json',
  async (req: Request, res: Response) => {
    console.log('Setting bidding signals', {...req.query});
    for (const key of Object.keys(req.query)) {
      trustedBiddingSignalStore.set(key, req.query[key]?.toString());
    }
    res.sendStatus(200);
  },
);

/** Rewrites the default values in the key value store. */
BiddingSignalsRouter.get(
  '/reset-scoring-signal.json',
  async (req: Request, res: Response) => {
    trustedBiddingSignalStore.rewriteDefaults();
    res.status(200).send(`Rewrote default real-time signals: ${HOSTNAME}`);
  },
);