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

import express, {Application, NextFunction, Request, Response} from 'express';
import {LOREM} from './constants.js';

const {EXTERNAL_PORT, PORT} = process.env;
const {HOME_HOST, NEWS_HOST, NEWS_DETAIL} = process.env;
const {AD_SERVER_HOST, DSP_HOST} = process.env;
const {SSP_HOST, SSP_A_HOST, SSP_B_HOST} = process.env;

const app: Application = express();
app.use(express.static('src/public'));
app.set('view engine', 'ejs');
app.set('views', 'src/views');

app.get('/', async (req: Request, res: Response) => {
  const {auctionType} = req.query;
  const bucket = req.query.key;
  const cloudEnv = req.query.env;
  res.render('index', {
    title: NEWS_DETAIL,
    lorem: LOREM,
    EXTERNAL_PORT,
    HOME_HOST,
    DSP_HOST,
    SSP_A_HOST,
    SSP_B_HOST,
    AD_SERVER_HOST,
    SSP_TAG_URL: `https://${SSP_HOST}/ssp-tag.js`,
    AD_SERVER_LIB_URL: `https://${AD_SERVER_HOST}/js/ad-server-lib.js`,
    HEADER_BIDDING_LIB_URL: `https://${NEWS_HOST}/js/header-bidding-lib.js`,
    isMultiSeller: auctionType === 'multi',
    bucket: bucket,
    cloudEnv: cloudEnv,
  });
});

app.get('/video-ad', async (req: Request, res: Response) => {
  res.render('video-ad', {
    title: NEWS_DETAIL,
    lorem: LOREM,
    EXTERNAL_PORT,
    HOME_HOST,
    SSP_HOST,
  });
});

app.listen(PORT, async () => {
  console.log(`Listening on port ${PORT}`);
});
