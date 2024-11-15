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
import {getAdTemplateVariables} from '../../lib/template-utils.js';
import {
  ADVERTISER_CONTEXTUAL,
  EXTERNAL_PORT,
  HOSTNAME,
  TRAVEL_HOST,
} from '../../lib/constants.js';

/**
 * This router is responsible for handling requests to serve ads, i.e. the ad
 * itself. These endpoints don't execute any selection logic. The URL should
 * be sufficient to point to a specific ad creative, using query parameters if
 * disambiguation is needed.
 *
 * Path: /ads/
 */
export const AdsRouter = express.Router();

// ************************************************************************
// HTTP handlers
// ************************************************************************
/** Used as render URL for contextual ads or static ads. */
AdsRouter.get('/contextual-ads', async (req: Request, res: Response) => {
  const registerSourceUrl = new URL(
    `https://${HOSTNAME}:${EXTERNAL_PORT}/attribution/register-source`,
  );
  registerSourceUrl.searchParams.append('advertiser', ADVERTISER_CONTEXTUAL);
  const templateVariables = {
    TITLE: `Contextual ads from ${ADVERTISER_CONTEXTUAL}`,
    DESTINATION: new URL(`https://${TRAVEL_HOST}:${EXTERNAL_PORT}`).toString(),
    CREATIVE: new URL( // Doughnut image.
      `https://${HOSTNAME}:${EXTERNAL_PORT}/img/emoji_u1f369.svg`,
    ).toString(),
    ATTRIBUTION_SRC: registerSourceUrl.toString(),
  };
  console.log('Loading contextual ad', templateVariables);
  res.render('contextual-ad-frame', templateVariables);
});

// PROTECTED AUDIENCE ADS
/** Used as render URL in interest groups for display ads. */
AdsRouter.get('/display-ads', async (req: Request, res: Response) => {
  const templateVariables = getAdTemplateVariables(req.query);
  console.log('Loading interest group ad', templateVariables);
  res
    .set('Allow-Fenced-Frame-Automatic-Beacons', 'true')
    .render('display-ad-frame', templateVariables);
});

/** Used as render URL in interest groups for video ads. */
AdsRouter.get('/video-ads', async (req: Request, res: Response) => {
  console.log('Loading video ad', req.query);
  res.render('video-ad-frame');
});
