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

import {EXTERNAL_PORT, HOSTNAME, PORT, SHOP_HOST} from '../lib/constants.js';

/** Returns variables for use in the ad template. */
export const getAdTemplateVariables = (requestQuery: any) => {
  const advertiser = requestQuery.advertiser?.toString() || HOSTNAME!;
  const registerSourceUrl = new URL(
    `https://${HOSTNAME}:${EXTERNAL_PORT}/attribution/register-source`,
  );
  registerSourceUrl.searchParams.append('advertiser', advertiser);
  // Initialze as default ad creative.
  let destination = new URL(
    `https://${advertiser}:${EXTERNAL_PORT}`,
  ).toString();
  let creative = new URL(
    `https://${advertiser}:${EXTERNAL_PORT}/ads`,
  ).toString();
  // Load specific ad for SHOP advertiser if product item ID is in context.
  const itemId = requestQuery.itemId?.toString() || '';
  if (itemId) {
    destination = new URL(
      `https://${advertiser}:${EXTERNAL_PORT}/items/${itemId}`,
    ).toString();
    creative = new URL(
      `https://${advertiser}:${EXTERNAL_PORT}/ads/${itemId}`,
    ).toString();
    registerSourceUrl.searchParams.append('itemId', itemId);
  }
  // If advertiser is current ad-tech itself, show static ad. If you visit the
  // ad-tech's index page, you'll be added to an interest group where the
  // ad-tech itself is the advertiser.
  if (HOSTNAME === advertiser) {
    creative = new URL( // Bag of cash image.
      `https://${HOSTNAME}:${EXTERNAL_PORT}/img/emoji_u1f4b0.svg`,
    ).toString();
  }
  return {
    TITLE: `Your special ads from ${advertiser}`,
    DESTINATION: destination,
    CREATIVE: creative,
    ATTRIBUTION_SRC: registerSourceUrl.toString(),
  };
};

/** Returns EJS template variables for EJS files. */
export const getTemplateVariables = (titleMessage: string = '') => {
  const hostDetails = {
    HOSTNAME,
    EXTERNAL_PORT,
    PORT,
    SHOP_HOST,
    TITLE: `${HOSTNAME} - ${titleMessage}`,
  };
  console.log('Built template context: ', hostDetails);
  return hostDetails;
};
