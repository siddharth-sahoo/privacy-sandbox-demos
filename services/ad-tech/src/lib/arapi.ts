// FIXME: This file needs to be rationalized with attribution-reporting-helper.ts
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

import {NEWS_HOST, SHOP_HOST, TRAVEL_HOST} from '../lib/constants.js';

// ****************************************************************************
// EXPORTED TYPES
// ****************************************************************************
type AggregationKeyStructure = {
  type: number;
  advertiser: number;
  publisher: number;
  id: number;
  dimension: number;
};

type AggregatableTriggerData = {
  type: number;
  id: number;
  size: number;
  category: number;
  option: number;
};

// ****************************************************************************
// CONSTANTS
// ****************************************************************************
/** Map of source type to encoded 2-bit values. */
export const SOURCE_TYPE_TO_ENCODED: {[index: string]: number} = {
  unknown: 0b00,
  click: 0b10,
  view: 0b11,
};

/** Map of advertiser host to encoded 16-bit values. */
export const ADVERTISER_TO_ENCODED: {[index: string]: number} = {
  SHOP_HOST: 0b0,
  TRAVEL_HOST: 0b1,
};

/** Map of publisher host to encoded 16-bit values. */
export const PUBLISHER_TO_ENCODED: {[index: string]: number} = {
  NEWS_HOST: 0b0,
};

/** Map of dimension name to encoded 8-bit values. */
export const DIMENSION_TO_ENCODED: {[index: string]: number} = {
  quantity: 0b0,
  gross: 0b1,
};

/** Map of trigger type to encoded 8-bit values. */
export const TRIGGER_TYPE_TO_ENCODED: {[index: string]: number} = {
  quantity: 0b1000_0000,
  gross: 0b1100_0000,
};

// ****************************************************************************
// HELPER FUNCTIONS
// ****************************************************************************
// type:        2bit
// dimension:   6bit
// id:         24bit
// advertiser: 16bit
// publisher:  16bit
// -----------------
//             64bit
function encodeSource(ako: AggregationKeyStructure) {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  const first32 = (((ako.type << 6) + ako.dimension) << 24) + ako.id;
  view.setUint32(0, first32);
  view.setUint16(4, ako.advertiser);
  view.setUint16(6, ako.publisher);
  return buffer;
}

function decodeSource(buffer: ArrayBuffer): AggregationKeyStructure {
  const view = new DataView(buffer);
  const first32 = view.getUint32(0);
  const id = first32 & (2 ** 24 - 1);
  const first8 = first32 >>> 24;
  const dimension = first8 & 0b111111;
  const type = first8 >>> 6;
  const advertiser = view.getUint16(4);
  const publisher = view.getUint16(6);
  return {type, dimension, id, advertiser, publisher};
}

// type:      8bit
// id:       24bit
// size:      8bit
// category:  8bit
// option:   16bit
// -----------------
//             64bit
function encodeTrigger(atd: AggregatableTriggerData) {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setUint32(0, (atd.type << 24) + atd.id);
  view.setUint8(4, atd.size);
  view.setUint8(5, atd.category);
  view.setUint16(6, atd.option);
  return buffer;
}

function decodeTrigger(buffer: ArrayBuffer): AggregatableTriggerData {
  const view = new DataView(buffer);
  const first32 = view.getUint32(0);
  const type = first32 >>> 24;
  const id = first32 & 0xffffff;
  const size = view.getUint8(4);
  const category = view.getUint8(5);
  const option = view.getUint16(6);
  return {type, id, size, category, option};
}

export function sourceEventId() {
  // 64bit dummy value
  return Math.random().toString().substring(2).replace(/^0/, '');
}

export function debugKey(): string {
  // 64bit dummy value
  return Math.random().toString().substring(2).replace(/^0/, '');
}

function key_from_value(object: any, value: any) {
  const key: string = Object.keys(object).find(
    (key) => object[key] === value,
  ) as string;
  return key;
}

function test() {
  const advertiser = ADVERTISER_TO_ENCODED['shop'];
  const publisher = PUBLISHER_TO_ENCODED['news'];
  const id = 0xff;
  const dimension = DIMENSION_TO_ENCODED['gross'];
  const size = (26.5 - 20) * 10;
  const category = 1;
  const source_type = SOURCE_TYPE_TO_ENCODED.click;
  const trigger_type = TRIGGER_TYPE_TO_ENCODED.gross;
  const option = 2;

  const source_key = encodeSourceKeyPiece({
    type: source_type,
    dimension,
    id,
    advertiser,
    publisher,
  });
  console.log({source_key});

  const trigger_key = encodeTriggerKeyPiece({
    type: trigger_type,
    id,
    size,
    category,
    option,
  });
  console.log({trigger_key});

  const source = encodeSource({
    type: source_type,
    dimension,
    id,
    advertiser,
    publisher,
  });
  console.log(decodeSource(source));

  const trigger = encodeTrigger({
    type: trigger_type,
    id,
    size,
    category,
    option,
  });
  console.log(decodeTrigger(trigger));
}

// ****************************************************************************
// EXPORTED FUNCTIONS
// ****************************************************************************
export function encodeSourceKeyPiece(ako: AggregationKeyStructure) {
  console.log(ako);
  const source = encodeSource(ako);
  const uint64: bigint = new DataView(source).getBigUint64(0, false);
  return `0x${(uint64 << 64n).toString(16)}`;
}

export function encodeTriggerKeyPiece(atd: AggregatableTriggerData) {
  console.log(atd);
  const trigger = encodeTrigger(atd);
  const uint64 = new DataView(trigger).getBigUint64(0, false);
  return `0x${'0'.repeat(16)}${uint64.toString(16)}`;
}

export function decodeBucket(buffer: ArrayBuffer) {
  const u8a = new Uint8Array(buffer);
  const sourceBuf = u8a.slice(0, u8a.length / 2);
  const source: AggregationKeyStructure = decodeSource(sourceBuf.buffer);
  const triggerBuf = u8a.slice(u8a.length / 2, u8a.length);
  const trigger: AggregatableTriggerData = decodeTrigger(triggerBuf.buffer);

  const aggregation_keys: {[index: string]: string} = {};
  aggregation_keys.type = key_from_value(SOURCE_TYPE_TO_ENCODED, source.type);
  aggregation_keys.dimension = key_from_value(DIMENSION_TO_ENCODED, source.dimension);
  aggregation_keys.id = source.id.toString(16);
  aggregation_keys.advertiser = key_from_value(ADVERTISER_TO_ENCODED, source.advertiser);
  aggregation_keys.publisher = key_from_value(PUBLISHER_TO_ENCODED, source.publisher);

  const aggregatable_trigger_data: {[index: string]: string} = {};
  aggregatable_trigger_data.type = key_from_value(TRIGGER_TYPE_TO_ENCODED, trigger.type);
  aggregatable_trigger_data.id = trigger.id.toString(16);
  aggregatable_trigger_data.size = trigger.size.toString();
  aggregatable_trigger_data.category = trigger.category.toString();
  aggregatable_trigger_data.option = trigger.option.toString();

  return {
    aggregation_keys,
    aggregatable_trigger_data,
  };
}
