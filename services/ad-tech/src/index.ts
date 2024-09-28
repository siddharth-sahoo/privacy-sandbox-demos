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

// DSP
import express, {Application, NextFunction, Request, Response} from 'express';

import {CommonRouter} from './common-router.js';
import {DspRouter} from './dsp-router.js';
import {EventReportRouter} from './event-report-router.js';
import {SspRouter} from './ssp-router.js';
import {getTemplateVariables} from './utils.js';

const {EXTERNAL_PORT, PORT} = process.env;

const app: Application = express();
app.use(express.urlencoded({extended: true}));
app.use(express.json());

app.use((req: Request, res: Response, next: NextFunction) => {
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

app.use(
  express.static('src/public', {
    setHeaders: (res: Response, path: string) => {
      if (
        path.endsWith('bidding-logic.js') ||
        path.endsWith('decision-logic.js') ||
        path.endsWith('bidding-signal.json')
      ) {
        return res.set('X-Allow-FLEDGE', 'true');
      }
      if (path.endsWith('/run-ad-auction.js')) {
        res.set('Supports-Loading-Mode', 'fenced-frame');
        res.set('Permissions-Policy', 'run-ad-auction=(*)');
      }
    },
  }),
);

app.set('view engine', 'ejs');
app.set('views', 'src/views');

app.use('/', CommonRouter);
app.use('/', EventReportRouter);
app.use('/dsp', DspRouter);
app.use('/ssp', SspRouter);

app.listen(PORT, function () {
  console.log(`Listening on port ${PORT}`);
});
