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

import express, {Application} from 'express';

import {CommonRouter} from './common-router.js';
import {DspRouter} from './dsp-router.js';
import {EventReportRouter} from './event-report-router.js';
import {SspRouter} from './ssp-router.js';

const app: Application = express();
app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.set('view engine', 'ejs');
app.set('views', 'src/views');

app.use('/', CommonRouter);
app.use('/', EventReportRouter);
app.use('/dsp', DspRouter);
app.use('/ssp', SspRouter);

const {PORT} = process.env;
app.listen(PORT, function () {
  console.log(`Listening on port ${PORT}`);
});
