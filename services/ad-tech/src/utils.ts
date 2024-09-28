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

const {PORT, EXTERNAL_PORT, SHOP_HOST} = process.env;
const {DSP_HOST, DSP_A_HOST, DSP_B_HOST} = process.env;
const {SSP_HOST, SSP_A_HOST, SSP_B_HOST} = process.env;
const {DSP_DETAIL, DSP_A_DETAIL, DSP_B_DETAIL} = process.env;
const {SSP_DETAIL, SSP_A_DETAIL, SSP_B_DETAIL,} = process.env;

/** Returns EJS template variables for current host. */
export const getTemplateVariables = (
  currHost: string,
  titleMessage: string = '',
) => {
  const hostDetails = {
    currHost,
    EXTERNAL_PORT,
    PORT,
    SHOP_HOST,
    title: `${getAdTechDetail(currHost)} - ${titleMessage}`,
  };
  console.log('Built template context: ', hostDetails);
  return hostDetails;
};

/** Returns the mapped ad tech label. */
const getAdTechDetail = (currHost: string): string | undefined => {
  switch (currHost) {
    case DSP_HOST:
      return DSP_DETAIL;
    case DSP_A_HOST:
      return DSP_A_DETAIL;
    case DSP_B_HOST:
      return DSP_B_DETAIL;
    case SSP_HOST:
      return SSP_DETAIL;
    case SSP_A_HOST:
      return SSP_A_DETAIL;
    case SSP_B_HOST:
      return SSP_B_DETAIL;
    default:
      return 'FIXME: UNKNOWN HOST';
  }
};
