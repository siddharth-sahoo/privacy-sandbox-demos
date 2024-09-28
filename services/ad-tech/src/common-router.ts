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
export const CommonRouter = express.Router();

// ************************************************************************
// HTTP handlers
// ************************************************************************
CommonRouter.get('/', async (req: Request, res: Response) => {
  if (req.hostname.includes('ssp')) {
    res.render('ssp/index', getTemplateVariables(req.hostname));
  } else {
    res.render('dsp/index', getTemplateVariables(req.hostname));
  }
});

/** Used as render URL in interest groups. */
CommonRouter.get('/ads', async (req: Request, res: Response) => {
  const {advertiser, itemId} = req.query;
  const currHost = req.hostname;
  console.log('Loading ad creative: ', req.query);
  const title = `Your special ads from ${advertiser}`;
  const destination = new URL(
    `https://${advertiser}:${EXTERNAL_PORT}/items/${itemId}`,
  );
  const creative = new URL(
    `https://${advertiser}:${EXTERNAL_PORT}/ads/${itemId}`,
  );
  const registerSource = new URL(
    `https://${currHost}:${EXTERNAL_PORT}/register-source`,
  );
  registerSource.searchParams.append('advertiser', advertiser as string);
  registerSource.searchParams.append('itemId', itemId as string);
  res.render('ads', {title, destination, creative, registerSource});
});
