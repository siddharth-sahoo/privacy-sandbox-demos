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

// SSP
import express from 'express';
import url from 'url';
import cbor from "cbor"
import { decodeDict } from "structured-field-values"
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
  TRIGGER_TYPE
} from "./arapi.js"

const {
  EXTERNAL_PORT,
  PORT,
  SSP_HOST,
  SSP_DETAIL,
  SSP_TOKEN,
  DSP_HOST,
  SHOP_HOST,
} = process.env;

// in-memory storage for debug reports
const Reports = [];
// clear in-memory storage every 10 min
setInterval(() => {
  Reports.length = 0;
}, 1000 * 60 * 10);

const app = express();

app.use((req, res, next) => {
  res.setHeader('Origin-Trial', SSP_TOKEN);
  next();
});
app.use(express.json());

app.use((req, res, next) => {
  // enable transitional debugging reports (https://github.com/WICG/attribution-reporting-api/blob/main/EVENT.md#optional-transitional-debugging-reports)
  res.cookie("ar_debug", "1", {
    sameSite: "none",
    secure: true,
    httpOnly: true
  });
  next();
});

app.use((req, res, next) => {
  // opt-in fencedframe
  if (req.get('sec-fetch-dest') === 'fencedframe') {
    res.setHeader('Supports-Loading-Mode', 'fenced-frame');
  }
  next();
});

app.use(
  express.static('src/public', {
    setHeaders: (res, path, stat) => {
      if (path.endsWith('/decision-logic.js')) {
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

app.get('/', async (req, res) => {
  const title = SSP_DETAIL;
  res.render('index.html.ejs', {
    title,
    DSP_HOST,
    SSP_HOST,
    EXTERNAL_PORT,
    SHOP_HOST,
  });
});

app.get('/reporting', async (req, res) => {
  console.log(`Event-level report received: ${req.originalUrl}`);
  res.status(200).send(`Event-level report received: ${JSON.stringify(req.query)}`);
  Reports.push(req.query);
});

app.post('/reporting', async (req, res) => {
  console.log(`Event-level report received: ${req.originalUrl}`);
  const report = {
    ...req.query,
    ...req.body,
  };
  Reports.push(report);
  if (req.headers['attribution-reporting-eligible']) {
    if (registerNavigationAttributionSourceIfApplicable(req, res)) {
      res.status(200)
        .send(`Event-level report received and navigation source registered: ${JSON.stringify(report)}`);
    } else if (registerEventAttributionSourceIfApplicable(req, res)) {
      res.status(200)
        .send(`Event-level report received and event source registered: ${JSON.stringify(report)}`);
    }
  } else {
    res.status(200).send(`Event-level report received: ${JSON.stringify(report)}`);
  }
});

const registerNavigationAttributionSourceIfApplicable = (req, res) => {
  if (!req.headers['attribution-reporting-eligible'] ||
    !('navigation-source' in decodeDict(req.headers['attribution-reporting-eligible']))) {
    return false;
  }
  const advertiser = req.query.advertiser;
  const id = req.query.id;
  console.log('Registering navigation source attribution for', {advertiser, id});
  const destination = `https://${advertiser}`;
  const source_event_id = sourceEventId();
  const debug_key = debugKey();
  const AttributionReportingRegisterSource = {
    demo_host: 'ssp',
    destination,
    source_event_id,
    debug_key,
    debug_reporting: true,  // Enable verbose debug reports.
    /*
    aggregation_keys: {
      quantity: sourceKeyPiece({
        type: SOURCE_TYPE['click'], // click attribution
        advertiser: ADVERTISER[advertiser],
        publisher: PUBLISHER['news'],
        id: Number(`0x${id}`),
        dimension: DIMENSION['quantity'],
      }),
      gross: sourceKeyPiece({
        type: SOURCE_TYPE['click'], // click attribution
        advertiser: ADVERTISER[advertiser],
        publisher: PUBLISHER['news'],
        id: Number(`0x${id}`),
        dimension: DIMENSION['gross'],
      }),
    },
    */
  };
  console.log('Registering navigation source :', {
    AttributionReportingRegisterSource,
  });
  res.setHeader(
    'Attribution-Reporting-Register-Source',
    JSON.stringify(AttributionReportingRegisterSource),
  );
  return true;
};

const registerEventAttributionSourceIfApplicable = (req, res) => {
  if (!req.headers['attribution-reporting-eligible'] ||
    !('event-source' in decodeDict(req.headers['attribution-reporting-eligible']))) {
    return false;
  }
  const advertiser = req.query.advertiser;
  const id = req.query.id;
  console.log('Registering event source attribution for', {advertiser, id});
  const destination = `https://${advertiser}`;
  const source_event_id = sourceEventId();
  const debug_key = debugKey();
  const AttributionReportingRegisterSource = {
    demo_host: 'ssp',
    destination,
    source_event_id,
    debug_key,
    debug_reporting: true,  // Enable verbose debug reports.
    /*
    aggregation_keys: {
      quantity: sourceKeyPiece({
        type: SOURCE_TYPE['view'], // view attribution
        advertiser: ADVERTISER[advertiser],
        publisher: PUBLISHER['news'],
        id: Number(`0x${id}`),
        dimension: DIMENSION['quantity'],
      }),
      gross: sourceKeyPiece({
        type: SOURCE_TYPE['view'], // view attribution
        advertiser: ADVERTISER[advertiser],
        publisher: PUBLISHER['news'],
        id: Number(`0x${id}`),
        dimension: DIMENSION['gross'],
      }),
    },
    */
  };
  console.log('Registering event source :', {
    AttributionReportingRegisterSource,
  });
  res.setHeader(
    'Attribution-Reporting-Register-Source',
    JSON.stringify(AttributionReportingRegisterSource),
  );
  return true;
};

app.get('/register-source', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers['origin']);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (!req.headers['attribution-reporting-eligible']) {
    res.status(400).send("'Attribution-Reporting-Eligible' header is missing");
    return;
  }
  if (registerNavigationAttributionSourceIfApplicable(req, res)) {
    res.status(200).send('attribution nevigation (click) source registered');
  } else if (registerEventAttributionSourceIfApplicable(req, res)) {
    res.status(200).send('attribution event (view) source registered');
  } else {
    res
      .status(400)
      .send("'Attribution-Reporting-Eligible' header is malformed");    
  }
});

app.get("/register-trigger", async (req, res) => {
  const { id, quantity, size, category, gross } = req.query

  const AttributionReportingRegisterTrigger = {
    aggregatable_trigger_data: [
      {
        key_piece: triggerKeyPiece({
          type: TRIGGER_TYPE["quantity"],
          id: parseInt(id, 16),
          size: Number(size),
          category: Number(category),
          option: 0
        }),
        source_keys: ["quantity"]
      },
      {
        key_piece: triggerKeyPiece({
          type: TRIGGER_TYPE["gross"],
          id: parseInt(id, 16),
          size: Number(size),
          category: Number(category),
          option: 0
        }),
        source_keys: ["gross"]
      }
    ],
    aggregatable_values: {
      // TODO: scaling
      quantity: Number(quantity),
      gross: Number(gross)
    },
    debug_key: debugKey()
  }
  res.setHeader("Attribution-Reporting-Register-Trigger", JSON.stringify(AttributionReportingRegisterTrigger))
  res.sendStatus(200)
})

app.get('/ad-tag.html', async (req, res) => {
  res.render('ad-tag.html.ejs');
});

app.get('/video-ad-tag.html', async (req, res) => {
  res.render('video-ad-tag.html.ejs');
});

app.get("/reports", async (req, res) => {
  res.render("reports.html.ejs", { title: "Report", Reports })
})

app.get('/auction-config.json', async (req, res) => {
  const DSP = new URL(`https://${DSP_HOST}:${EXTERNAL_PORT}`);
  const SSP = new URL(`https://${SSP_HOST}:${EXTERNAL_PORT}`);
  const auctionConfig = {
    // should https & same as decisionLogicUrl's origin
    seller: SSP,

    // x-allow-fledge: true
    decisionLogicUrl: `${SSP}js/decision-logic.js`,

    interestGroupBuyers: [
      // * is not supported yet
      DSP,
    ],
    // public for everyone
    auctionSignals: {
      auction_signals: 'auction_signals',
    },

    // only for single party
    sellerSignals: {
      seller_signals: 'seller_signals',
    },

    // only for single party
    perBuyerSignals: {
      // listed on interestGroupByers
      [DSP]: {
        per_buyer_signals: 'per_buyer_signals',
      },
    },

    // use with fencedframe
    resolveToConfig: true,
  };
  console.log({auctionConfig});
  res.json(auctionConfig);
});

app.get("/ads", async (req, res) => {
  const { advertiser, id } = req.query
  console.log("Loading frame content : ", { advertiser, id })

  const title = `Your special ads from ${advertiser}`

  const move = new URL(`https://${SSP_HOST}:${EXTERNAL_PORT}/move`)
  move.searchParams.append("advertiser", advertiser)
  move.searchParams.append("id", id)

  const creative = new URL(`https://${SSP_HOST}:${EXTERNAL_PORT}/creative`)
  creative.searchParams.append("advertiser", advertiser)
  creative.searchParams.append("id", id)

  const registerSource = new URL(`https://${SSP_HOST}:${EXTERNAL_PORT}/register-source`)
  registerSource.searchParams.append("advertiser", advertiser)
  registerSource.searchParams.append("id", id)

  res.render("ads.html.ejs", { title, move, creative, registerSource })
  res.render("index.html.ejs", { title, DSP_HOST, SSP_HOST, EXTERNAL_PORT, SHOP_HOST })
});

app.get("/move", async (req, res) => {
  const { advertiser, id } = req.query
  //console.log({ advertiser, id })
  const url = `https://${advertiser}/items/${id}`

  res.redirect(302, url)
});

app.get("/creative", async (req, res) => {
  const { advertiser, id } = req.query

  // redirect to advertisers Ads endpoint
  res.redirect(`https://${advertiser}/ads/${id}`)
});

app.post("/.well-known/attribution-reporting/debug/report-aggregate-attribution", async (req, res) => {
  const debug_report = req.body
  debug_report.shared_info = JSON.parse(debug_report.shared_info)

  console.log(JSON.stringify(debug_report, " ", " "))

  debug_report.aggregation_service_payloads = debug_report.aggregation_service_payloads.map((e) => {
    const plain = Buffer.from(e.debug_cleartext_payload, "base64")
    const debug_cleartext_payload = cbor.decodeAllSync(plain)
    e.debug_cleartext_payload = debug_cleartext_payload.map(({ data, operation }) => {
      return {
        operation,
        data: data.map(({ value, bucket }) => {
          return {
            value: value.readUInt32BE(0),
            bucket: decodeBucket(bucket)
          }
        })
      }
    })
    return e
  })

  console.log(JSON.stringify(debug_report, " ", " "))

  // save to global storage
  Reports.push(debug_report)

  res.sendStatus(200)
})

app.post("/.well-known/attribution-reporting/report-aggregate-attribution", async (req, res) => {
  const report = req.body
  report.shared_info = JSON.parse(report.shared_info)
  console.log(JSON.stringify(report, " ", " "))
  res.sendStatus(200)
})

app.listen(PORT, function () {
  console.log(`Listening on port ${PORT}`);
});
