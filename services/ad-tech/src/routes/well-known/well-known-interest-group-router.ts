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

import cbor from 'cbor';
import express, {Request, Response} from 'express';

/**
 * This router is responsible for handling well-known endpoints for the
 * real-time monitoring feature in Protected Audience.
 * 
 * Path: /.well-known/interest-group/
 */
export const WellKnownInterestGroupRouter = express.Router();

// ************************************************************************
// Protected Audience: Real-time Monitoring
// ************************************************************************
WellKnownInterestGroupRouter.post('/real-time-report', async (req: Request, res: Response) => {
  const {version, histogram, platformHistogram} = cbor.decodeFirstSync(req.body);
  const histogramBuckets = histogram.buckets;
  const platformHistogramBuckets = platformHistogram.buckets;
  // TODO: Implement
  console.log('Received real-time report', {
    apiVersion: version,
    histogram,
    platformHistogram,
  });
  res.sendStatus(200).send();
});

// ****************************************************************************
// HISTOGRAM BUCKET DEFINITIONS FOR REAL-TIME MONITORING IN PROTECTED AUDIENCE
// ****************************************************************************
/** Definitions of platform histogram buckets. */
export const PLATFORM_HISTOGRAM_BUCKETS: {[key: number]: string} = {
  // These buckets are defined by the browser.
  // Each platform histogram bucket has a priority weight of 1. 
  0: 'Buyer bidding script fetch error',
  1: 'Seller decision script fetch error',
  2: 'Buyer bidding signals fetch error',
  3: 'Seller scoring signals fetch error',
};
/** Definitions of regular histogram buckets; defined by ad-tech. */
export const REGULAR_HISTOGRAM_BUCKETS: {[key: number]: string} = {
  // Ad-techs may define up to 1024 buckets.
  0: 'Script execution slower than 300ms',
  1: 'Script execution slower than 150ms',
};