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
import {decodeDict} from 'structured-field-values';

import {
  debugKey,
  sourceEventId,
  sourceKeyPiece,
  triggerKeyPiece,
  ADVERTISER,
  PUBLISHER,
  DIMENSION,
  decodeBucket,
  SOURCE_TYPE,
  TRIGGER_TYPE,
} from './arapi.js';
import {getTemplateVariables} from './utils.js';

export const eventReportRouter = express.Router();

// In-memory storage for all reports
const Reports: any[] = [];
// Clear in-memory storage every 10 min
setInterval(() => {
  Reports.length = 0;
}, 1000 * 60 * 10);
/** Add a new report to the in-memory storage. */
export const pushEventLevelReport = (report: any) => {
  Reports.push(report);
};

// HTTP handlers
/** Show reports from in-memory storage. */
eventReportRouter.get('/reports', async (req: Request, res: Response) => {
  const hostDetails = getTemplateVariables(req.hostname, 'Reports');
  res.render('reports', {Reports, ...hostDetails});
});

eventReportRouter.get('/reporting', async (req: Request, res: Response) => {
  handleEventLevelReport(
    req,
    res,
    /* report= */ {
      category: 'Event log',
      ts: Date.now().toString(),
      data: req.query,
    },
  );
});

eventReportRouter.post('/reporting', async (req: Request, res: Response) => {
  handleEventLevelReport(
    req,
    res,
    /* report= */ {
      category: 'Event log',
      ts: Date.now().toString(),
      data: {
        ...req.query,
        ...req.body,
      },
    },
  );
});

// ************************************************************************
// Attribution Reporting HTTP handlers
// ************************************************************************
eventReportRouter.get(
  '/register-source',
  async (req: Request, res: Response) => {
    if (!req.headers['attribution-reporting-eligible']) {
      res
        .status(400)
        .send('"Attribution-Reporting-Eligible" header is missing');
      return;
    }
    if (registerNavigationAttributionSourceIfApplicable(req, res)) {
      res.status(200).send('Attribution nevigation (click) source registered');
    } else if (registerEventAttributionSourceIfApplicable(req, res)) {
      res.status(200).send('Attribution event (view) source registered');
    } else {
      res
        .status(400)
        .send('"Attribution-Reporting-Eligible" header is malformed');
    }
  },
);

eventReportRouter.get(
  '/register-trigger',
  async (req: Request, res: Response) => {
    const id: string = req.query.itemId as string;
    const quantity: string = req.query.quantity as string;
    const size: string = req.query.size as string;
    const category: string = req.query.category as string;
    const gross: string = req.query.gross as string;
    const AttributionReportingRegisterTrigger = {
      event_trigger_data: [
        {
          trigger_data: '1',
          priority: '100',
          // deduplication_key: '1234',
        },
      ],
      aggregatable_trigger_data: [
        {
          key_piece: triggerKeyPiece({
            type: TRIGGER_TYPE['quantity'],
            id: parseInt(id, 16),
            size: Number(size),
            category: Number(category),
            option: 0,
          }),
          source_keys: ['quantity'],
        },
        {
          key_piece: triggerKeyPiece({
            type: TRIGGER_TYPE['gross'],
            id: parseInt(id, 16),
            size: Number(size),
            category: Number(category),
            option: 0,
          }),
          source_keys: ['gross'],
        },
      ],
      aggregatable_values: {
        // TODO: scaling
        quantity: Number(quantity),
        gross: Number(gross),
      },
      debug_key: debugKey(),
    };
    res.setHeader(
      'Attribution-Reporting-Register-Trigger',
      JSON.stringify(AttributionReportingRegisterTrigger),
    );
    res.sendStatus(200);
  },
);

eventReportRouter.post(
  '/.well-known/attribution-reporting/report-event-attribution',
  async (req: Request, res: Response) => {
    console.log(
      '[ARA] Received event-level report on live endpoint: ',
      req.body,
    );
    pushEventLevelReport({
      category: 'ARA event-level',
      ts: Date.now().toString(),
      data: req.body,
    });
    res.sendStatus(200);
  },
);

eventReportRouter.post(
  '/.well-known/attribution-reporting/debug/report-event-attribution',
  async (req: Request, res: Response) => {
    console.log(
      '[ARA] Received event-level report on debug endpoint: ',
      req.body,
    );
    pushEventLevelReport({
      category: 'ARA event-level debug',
      ts: Date.now().toString(),
      data: req.body,
    });
    res.sendStatus(200);
  },
);

eventReportRouter.post(
  '/.well-known/attribution-reporting/debug/report-aggregate-attribution',
  async (req: Request, res: Response) => {
    const debugReport = req.body;
    debugReport.shared_info = JSON.parse(debugReport.shared_info);
    debugReport.aggregation_service_payloads =
      debugReport.aggregation_service_payloads.map((e: any) => {
        const plain = Buffer.from(e.debug_cleartext_payload, 'base64');
        const debug_cleartext_payload = cbor.decodeAllSync(plain);
        e.debug_cleartext_payload = debug_cleartext_payload.map(
          ({data, operation}) => {
            return {
              operation,
              data: data.map(({value, bucket}: any) => {
                return {
                  value: value.readUInt32BE(0),
                  bucket: decodeBucket(bucket),
                };
              }),
            };
          },
        );
        return e;
      });
    console.log(
      '[ARA] Received aggregatable report on debug endpoint: ',
      JSON.stringify(debugReport),
    );
    // Save to global storage
    pushEventLevelReport({
      category: 'ARA aggregate debug',
      ts: Date.now().toString(),
      data: debugReport,
    });
    res.sendStatus(200);
  },
);

eventReportRouter.post(
  '/.well-known/attribution-reporting/report-aggregate-attribution',
  async (req: Request, res: Response) => {
    const report = req.body;
    report.shared_info = JSON.parse(report.shared_info);
    console.log(
      '[ARA] Received aggregatable report on live endpoint: ',
      JSON.stringify(report),
    );
    pushEventLevelReport({
      category: 'ARA aggregate',
      ts: Date.now().toString(),
      data: report,
    });
    res.sendStatus(200);
  },
);

// ************************************************************************
// Private Aggregation HTTP handlers
// ************************************************************************
eventReportRouter.post(
  '/.well-known/private-aggregation/report-shared-storage',
  (req: Request, res: Response) => {
    console.log(
      '[pAgg+SS] Received aggregatable report on live endpoint: ',
      req.body,
    );
    pushEventLevelReport({
      category: 'pAgg with SS',
      ts: Date.now().toString(),
      data: req.body,
    });
    res.sendStatus(200);
  },
);

eventReportRouter.post(
  '/.well-known/private-aggregation/debug/report-shared-storage',
  (req: Request, res: Response) => {
    console.log(
      '[pAgg+SS] Received aggregatable report on debug endpoint: ',
      req.body,
    );
    pushEventLevelReport({
      category: 'pAgg with SS',
      ts: Date.now().toString(),
      data: req.body,
    });
    res.sendStatus(200);
  },
);

/** Consumes event-level reports and integrates with ARA if applicable */
const handleEventLevelReport = (req: Request, res: Response, report: any) => {
  console.log('Event-level report received: ', req.originalUrl, report);
  Reports.push(report);
  // Check if request is eligible for ARA.
  if (!('attribution-reporting-eligible' in req.headers)) {
    res
      .status(200)
      .send(`Event-level report received: ${JSON.stringify(req.query)}`);
    return;
  } else {
    handleAttributionReporting(req, res);
  }
};

const handleAttributionReporting = (req: Request, res: Response) => {
  // Try registering attribution sources.
  if (registerNavigationAttributionSourceIfApplicable(req, res)) {
    console.log('[ARA] Navigation source registered');
  } else if (registerEventAttributionSourceIfApplicable(req, res)) {
    console.log('[ARA] Event source registered');
  }
  // Check if redirect is needed.
  if ('redirect' in req.query) {
    const query = Object.entries(req.query)
      .filter(([key, _]) => key !== 'redirect')
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
    const redirectUrl = `${req.query['redirect']}/register-source?${query}`;
    res.redirect(redirectUrl);
  } else {
    res
      .status(200)
      .send(
        `Event-level report received and attribution source registered: ${JSON.stringify(
          req.query,
        )}`,
      );
  }
};

// ************************************************************************
// Attribution Reporting helper functions
// ************************************************************************
/** Registers click-thru attribution if applicable. */
const registerNavigationAttributionSourceIfApplicable = (
  req: Request,
  res: Response,
) => {
  if (
    !('attribution-reporting-eligible' in req.headers) ||
    !(
      'navigation-source' in
      decodeDict(req.headers['attribution-reporting-eligible'] as string)
    )
  ) {
    return false;
  }
  const advertiser = req.query.advertiser as string;
  const id = req.query.itemId as string;
  console.log('[ARA] Registering navigation source attribution for', {
    advertiser,
    id,
  });
  const destination = `https://${advertiser}`;
  const source_event_id = sourceEventId();
  const debug_key = debugKey();
  const AttributionReportingRegisterSource = {
    demo_host: 'dsp', // Included for debugging, not an actual field.
    destination,
    source_event_id,
    debug_key,
    debug_reporting: true, // Enable verbose debug reports.
    aggregation_keys: {
      quantity: sourceKeyPiece({
        type: SOURCE_TYPE['click'],
        advertiser: ADVERTISER[advertiser],
        publisher: PUBLISHER['news'],
        id: Number(`0x${id}`),
        dimension: DIMENSION['quantity'],
      }),
      gross: sourceKeyPiece({
        type: SOURCE_TYPE['click'],
        advertiser: ADVERTISER[advertiser],
        publisher: PUBLISHER['news'],
        id: Number(`0x${id}`),
        dimension: DIMENSION['gross'],
      }),
    },
  };
  console.log('[ARA] Registering navigation source :', {
    AttributionReportingRegisterSource,
  });
  res.setHeader(
    'Attribution-Reporting-Register-Source',
    JSON.stringify(AttributionReportingRegisterSource),
  );
  return true;
};

/** Registers view-thru attribution if applicable */
const registerEventAttributionSourceIfApplicable = (
  req: Request,
  res: Response,
) => {
  if (
    !('attribution-reporting-eligible' in req.headers) ||
    !(
      'event-source' in
      decodeDict(req.headers['attribution-reporting-eligible'] as string)
    )
  ) {
    return false;
  }
  const advertiser: string = req.query.advertiser as string;
  const id: string = req.query.itemId as string;
  console.log('[ARA] Registering event source attribution for', {
    advertiser,
    id,
  });
  const destination = `https://${advertiser}`;
  const source_event_id = sourceEventId();
  const debug_key = debugKey();
  const AttributionReportingRegisterSource = {
    demo_host: 'dsp', // Included for debugging, not an actual field.
    destination,
    source_event_id,
    debug_key,
    debug_reporting: true, // Enable verbose debug reports.
    aggregation_keys: {
      quantity: sourceKeyPiece({
        type: SOURCE_TYPE['view'],
        advertiser: ADVERTISER[advertiser],
        publisher: PUBLISHER['news'],
        id: Number(`0x${id}`),
        dimension: DIMENSION['quantity'],
      }),
      gross: sourceKeyPiece({
        type: SOURCE_TYPE['view'],
        advertiser: ADVERTISER[advertiser],
        publisher: PUBLISHER['news'],
        id: Number(`0x${id}`),
        dimension: DIMENSION['gross'],
      }),
    },
  };
  console.log('[ARA] Registering event source :', {
    AttributionReportingRegisterSource,
  });
  res.setHeader(
    'Attribution-Reporting-Register-Source',
    JSON.stringify(AttributionReportingRegisterSource),
  );
  return true;
};
