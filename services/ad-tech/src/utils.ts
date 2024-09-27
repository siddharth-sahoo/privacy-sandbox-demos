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

const {
  EXTERNAL_PORT,
  PORT,
  DSP_HOST,
  DSP_A_HOST,
  DSP_B_HOST,
  DSP_DETAIL,
  DSP_A_DETAIL,
  DSP_B_DETAIL,
  SHOP_HOST,
} = process.env;

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
    title: '',
  };
  switch (currHost) {
    case DSP_HOST:
      hostDetails.title = `${titleMessage} - ${DSP_DETAIL}`;
      break;
    case DSP_A_HOST:
      hostDetails.title = `${titleMessage} - ${DSP_A_DETAIL}`;
      break;
    case DSP_B_HOST:
      hostDetails.title = `${titleMessage} - ${DSP_B_DETAIL}`;
      break;
    default:
      hostDetails.title = `${titleMessage} - FIX: UNKNOWN DSP HOST`;
      break;
  }
  console.log('Built template context: ', hostDetails);
  return hostDetails;
};
