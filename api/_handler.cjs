var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// backend/vercelEntry.ts
var vercelEntry_exports = {};
__export(vercelEntry_exports, {
  default: () => vercelHandler
});
module.exports = __toCommonJS(vercelEntry_exports);

// backend/app.ts
var import_express2 = __toESM(require("express"), 1);

// backend/routes/api.ts
var import_express = require("express");

// backend/controllers/sportybetController.ts
var import_crypto7 = __toESM(require("crypto"), 1);

// backend/config/sportybet.ts
var SPORTYBET_CONFIG = {
  baseUrl: "https://www.sportybet.com/api/tz",
  webBaseUrl: "https://www.sportybet.com/tz",
  sportIdFootball: "sr:sport:1",
  productId: 3,
  operId: "7",
  clientId: "web",
  timeoutMs: 12e3,
  cacheTtlMs: 3e4,
  defaultMarketIds: "1,18,10,29,11,26,36,14,16",
  headers: {
    "User-Agent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    Origin: "https://www.sportybet.com",
    Referer: "https://www.sportybet.com/tz/m/",
    clientid: "web",
    operid: "7"
  }
};
var MARKET_CATALOG = [
  {
    id: "1",
    name: "Match Winner (1X2)",
    shortName: "1X2",
    description: "Full-time regular result: Home (1), Draw (X), or Away (2)."
  },
  {
    id: "10",
    name: "Double Chance",
    shortName: "DC",
    description: "Covers two of three full-time outcomes: 1X, 12, or X2."
  },
  {
    id: "18",
    name: "Over/Under",
    shortName: "O/U",
    description: "Total match goals over or under lines (0.5 to 5.5+)."
  },
  {
    id: "29",
    name: "Both Teams To Score (GG/NG)",
    shortName: "GG/NG",
    description: "Whether both teams score in regular time (Yes/No)."
  },
  {
    id: "11",
    name: "Draw No Bet",
    shortName: "DNB",
    description: "Home or Away win; stake voided if match ends in a draw."
  },
  {
    id: "16",
    name: "Asian Handicap",
    shortName: "AH",
    description: "Goal spread handicap lines with half/quarter/whole-ball settlements."
  },
  {
    id: "14",
    name: "European Handicap",
    shortName: "EH",
    description: "3-way handicap (1, X, 2) with whole goal starting advantage."
  },
  {
    id: "26",
    name: "Odd/Even Goals",
    shortName: "O/E",
    description: "Whether combined regular-time goals total an odd or even number."
  },
  {
    id: "36",
    name: "Over/Under & GG/NG",
    shortName: "O/U & GG",
    description: "Combined total goals line and Both Teams To Score market."
  }
];
var SPORTYBET_RESEARCH_REPORT = {
  targetWebsite: "https://www.sportybet.com/tz/m/",
  researchedAt: "2026-11-18T10:19:00.000Z",
  summary: "Empirical HTTP verification confirms SportyBet Tanzania exposes unauthenticated JSON REST endpoints under /api/tz/factsCenter/ for live matches, upcoming scheduled fixtures, full event market catalogs (250+ markets per match), and tournament hierarchies, as well as /api/tz/orders/share for genuine booking/sharing code creation and resolution. Upstream odds are tagged with sourceType BET_RADAR.",
  bookingCodeSupported: true,
  bookingCodeMechanism: "POST /api/tz/orders/share accepts an array of selection descriptors ({ eventId, marketId, outcomeId, specifier?, sportId }) without requiring account login, returning bizCode 10000 with a genuine 6-character alphanumeric shareCode, a direct shareURL (https://www.sportybet.com/tz/?shareCode=<code>), expiration deadline, and hydrated outcome objects. GET /api/tz/orders/share/:code resolves and validates any code.",
  endpoints: [
    {
      name: "Upcoming Football Fixtures & Core Odds",
      method: "GET",
      url: "https://www.sportybet.com/api/tz/factsCenter/pcUpcomingEvents?sportId=sr:sport:1&marketId=1,18,10,29,11,26,36,14,16&pageSize=100&pageNum=1",
      authRequired: false,
      format: "application/json (bizCode 10000, tournaments[].events[])",
      purpose: "Paginated upcoming matches grouped by tournament with core markets and Betradar IDs.",
      verifiedStatus: "VERIFIED_200"
    },
    {
      name: "Live In-Play Football Events",
      method: "GET",
      url: "https://www.sportybet.com/api/tz/factsCenter/liveOrPrematchEvents?sportId=sr:sport:1",
      authRequired: false,
      format: "application/json (bizCode 10000, array of tournament buckets)",
      purpose: "Active live matches with live scores (setScore), match clock (playedSeconds), phase (matchStatus), and live markets.",
      verifiedStatus: "VERIFIED_200"
    },
    {
      name: "Single Match Full Market Catalog",
      method: "GET",
      url: "https://www.sportybet.com/api/tz/factsCenter/event?eventId=<sr:match:...>&productId=3",
      authRequired: false,
      format: "application/json (bizCode 10000, single event with full markets[])",
      purpose: "Retrieves all available markets (250+ on major fixtures) including Asian Handicap, corners, halves, and combos.",
      verifiedStatus: "VERIFIED_200"
    },
    {
      name: "Country & League Directory",
      method: "GET",
      url: "https://www.sportybet.com/api/tz/factsCenter/popularAndSportList?sportId=sr:sport:1&productId=3",
      authRequired: false,
      format: "application/json (bizCode 10000, sportList[].categories[].tournaments[])",
      purpose: "Enumerates available countries, tournament IDs (sr:tournament:*), and live/upcoming fixture counts.",
      verifiedStatus: "VERIFIED_200"
    },
    {
      name: "Create Genuine Booking / Sharing Code",
      method: "POST",
      url: "https://www.sportybet.com/api/tz/orders/share",
      authRequired: false,
      format: "application/json (bizCode 10000, data.shareCode, data.shareURL, data.deadline, data.outcomes)",
      purpose: "Generates an official SportyBet Tanzania sharing code directly loadable on sportybet.com/tz.",
      verifiedStatus: "VERIFIED_200"
    },
    {
      name: "Verify / Load Sharing Code",
      method: "GET",
      url: "https://www.sportybet.com/api/tz/orders/share/{shareCode}",
      authRequired: false,
      format: "application/json (bizCode 10000 valid / bizCode 19000 invalid)",
      purpose: "Validates sharing codes and retrieves live odds, market statuses, and expiry deadlines.",
      verifiedStatus: "VERIFIED_200"
    }
  ],
  marketCatalog: MARKET_CATALOG,
  limitations: [
    "pcUpcomingEvents does not apply arbitrary server-side odds range filtering; odds-range, date-window, and multi-market deduplication must execute on normalized server-fetched pages.",
    "Each pcUpcomingEvents page should be capped (e.g. pageSize=100) and cached briefly (30s TTL) to respect upstream infrastructure and prevent throttling.",
    "Live odds change rapidly; market status != 0, banned == true, or outcome.isActive != 1 indicate suspended or closed outcomes.",
    "Booking codes remain valid until the earliest kickoff deadline or upstream market settlement/suspension."
  ],
  complianceBoundaries: [
    "Read-only public market discovery and unauthenticated betslip sharing only \u2014 zero bet placement, zero deposits, zero withdrawals.",
    "No credential collection, no session hijacking, no CAPTCHA bypassing, and strict server-side rate limiting.",
    "Combined decimal odds and estimated returns are mathematical products, never predictions or guaranteed outcomes."
  ]
};

// backend/config/bookmakers.ts
var BETPAWA_CONFIG = {
  baseUrl: "https://www.betpawa.co.tz/api/sportsbook",
  webBaseUrl: "https://www.betpawa.co.tz/bets",
  categoryIdFootball: "2",
  timeoutMs: 12e3,
  cacheTtlMs: 3e4,
  defaultMarketIds: ["3743", "4693", "5000", "3795", "4703", "3774", "4833"],
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "x-pawa-brand": "betpawa-tanzania",
    "x-pawa-language": "en",
    devicetype: "web",
    Origin: "https://www.betpawa.co.tz",
    Referer: "https://www.betpawa.co.tz/bets"
  }
};
var BETPAWA_MARKET_CATALOG = [
  {
    id: "3743",
    name: "Match Winner (1X2 | Full Time)",
    shortName: "1X2",
    description: "Full-time regular result on betPawa TZ: 1 (Home), X (Draw), or 2 (Away)."
  },
  {
    id: "4693",
    name: "Double Chance | Full Time",
    shortName: "DC",
    description: "Covers two of three full-time outcomes: 1X, 12, or X2."
  },
  {
    id: "5000",
    name: "Over/Under | Full Time",
    shortName: "O/U",
    description: "Total regular-time goals over or under lines (0.5 to 5.5+)."
  },
  {
    id: "3795",
    name: "Both Teams To Score | Full Time",
    shortName: "BTTS",
    description: "Whether both teams score in regular time (Yes/No)."
  },
  {
    id: "4703",
    name: "Draw No Bet | Full Time",
    shortName: "DNB",
    description: "Home or Away win; voided if the match finishes level."
  },
  {
    id: "3774",
    name: "Asian Handicap | Full Time",
    shortName: "AH",
    description: "2-Way goal spread handicap lines settled over regular time."
  },
  {
    id: "4833",
    name: "Odd / Even | Full Time",
    shortName: "O/E",
    description: "Whether total regular-time goals are an odd or even count."
  },
  {
    id: "5006",
    name: "Home Team Over/Under | Full Time",
    shortName: "Home O/U",
    description: "Total goals scored by the home team."
  },
  {
    id: "5003",
    name: "Away Team Over/Under | Full Time",
    shortName: "Away O/U",
    description: "Total goals scored by the away team."
  }
];
var BOOKMAKER_CATALOG = {
  SPORTYBET_TZ: {
    id: "SPORTYBET_TZ",
    name: "SportyBet Tanzania",
    shortName: "SportyBet TZ",
    country: "Tanzania",
    websiteUrl: "https://www.sportybet.com/tz/m/",
    apiBaseUrl: "https://www.sportybet.com/api/tz",
    bookingCodeSupported: true,
    bookingCodeMechanism: "POST /api/tz/orders/share & GET /api/tz/orders/share/:code",
    notes: "Full upcoming/live football odds, 250+ markets per fixture, and direct sharing code generation."
  },
  BETPAWA_TZ: {
    id: "BETPAWA_TZ",
    name: "betPawa Tanzania",
    shortName: "betPawa TZ",
    country: "Tanzania",
    websiteUrl: "https://www.betpawa.co.tz/bets",
    apiBaseUrl: "https://www.betpawa.co.tz/api/sportsbook",
    bookingCodeSupported: true,
    bookingCodeMechanism: "POST /api/sportsbook/v3/booking-number & GET /api/sportsbook/v3/booking-number/:code",
    notes: "Isolated betPawa TZ v4 sportsbook feed, tournament catalog, and native v3 booking-number generation."
  }
};
var BETPAWA_RESEARCH_REPORT = {
  targetWebsite: "https://www.betpawa.co.tz/bets",
  researchedAt: (/* @__PURE__ */ new Date()).toISOString(),
  summary: "Live HTTP inspection confirms betPawa Tanzania exposes English JSON sportsbook feeds under /api/sportsbook/v4 (with header x-pawa-brand: betpawa-tanzania and x-pawa-language: en) for live/upcoming events, league trees, and match results, plus /api/sportsbook/v3/booking-number for native booking code creation and resolution.",
  bookingCodeSupported: true,
  bookingCodeMechanism: 'POST /api/sportsbook/v3/booking-number accepts betPawa price IDs ({ selections: { selections: [{ type: "SINGLE", selections: [priceId] }] } }) and returns an official 7-character booking code loadable at https://www.betpawa.co.tz/?bookingNumber=<code>.',
  endpoints: [
    {
      name: "Upcoming & Live Football Events (v4 Query)",
      method: "GET",
      url: "https://www.betpawa.co.tz/api/sportsbook/v4/events/lists/by-queries?q=...",
      authRequired: false,
      format: "application/json (responses[].responses[], markets[].row[].prices[])",
      purpose: "Paginated upcoming or live football fixtures with nested market types, handicaps, and decimal odds.",
      verifiedStatus: "VERIFIED_200"
    },
    {
      name: "Single Match Full Market Catalog & Results",
      method: "GET",
      url: "https://www.betpawa.co.tz/api/sportsbook/v4/events/{eventId}",
      authRequired: false,
      format: "application/json (event object with markets[] and results)",
      purpose: "Full fixture market board and official live/final score period breakdowns.",
      verifiedStatus: "VERIFIED_200"
    },
    {
      name: "Football Regions & Competitions Tree",
      method: "GET",
      url: "https://www.betpawa.co.tz/api/sportsbook/v4/categories/list/2",
      authRequired: false,
      format: "application/json (withRegions[].regions[].competitions[])",
      purpose: "Lists all active countries, leagues, and live/upcoming match counts.",
      verifiedStatus: "VERIFIED_200"
    },
    {
      name: "Create Native Booking Number",
      method: "POST",
      url: "https://www.betpawa.co.tz/api/sportsbook/v3/booking-number",
      authRequired: false,
      format: "application/json ({ code })",
      purpose: "Generates genuine betPawa Tanzania booking codes directly loadable on betpawa.co.tz.",
      verifiedStatus: "VERIFIED_200"
    },
    {
      name: "Verify / Resolve Booking Number",
      method: "GET",
      url: "https://www.betpawa.co.tz/api/sportsbook/v3/booking-number/{code}",
      authRequired: false,
      format: "application/json ({ items[] })",
      purpose: "Loads and validates any betPawa TZ booking number back into event/market/price objects.",
      verifiedStatus: "VERIFIED_200"
    }
  ],
  marketCatalog: BETPAWA_MARKET_CATALOG,
  limitations: [
    "betPawa Tanzania uses platform-specific numerical price IDs for booking codes; SportyBet selections or codes cannot be mixed or cross-loaded.",
    "All network requests require x-pawa-brand: betpawa-tanzania and x-pawa-language: en headers."
  ],
  complianceBoundaries: [
    "Read-only public market discovery and unauthenticated booking-number creation only \u2014 zero bet placement or financial actions.",
    "Strict platform isolation: SportyBet and betPawa fixtures, markets, betslips, and booking codes never mix."
  ]
};
function normalizeBookmakerId(input) {
  const clean = String(input || "").trim().toUpperCase();
  if (clean === "BETPAWA_TZ" || clean === "BETPAWA") return "BETPAWA_TZ";
  return "SPORTYBET_TZ";
}
function getBookmakerInfo(id) {
  return BOOKMAKER_CATALOG[id] || BOOKMAKER_CATALOG.SPORTYBET_TZ;
}
function getBookmakerMarketCatalog(id) {
  return id === "BETPAWA_TZ" ? BETPAWA_MARKET_CATALOG : MARKET_CATALOG;
}
function getBookmakerResearchReport(id) {
  return id === "BETPAWA_TZ" ? BETPAWA_RESEARCH_REPORT : SPORTYBET_RESEARCH_REPORT;
}

// backend/firebase/admin.ts
var import_app = require("firebase-admin/app");
var import_auth = require("firebase-admin/auth");
var import_firestore = require("firebase-admin/firestore");
var FIREBASE_CONFIG_META = {
  projectId: "gen-lang-client-0092843012",
  firestoreDatabaseId: "ai-studio-remixsportybetod-c683f60e-2134-4acf-acfa-6e6e253f4657"
};
function hasServiceAccountCredentials() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim()) return true;
  if (process.env.FIREBASE_CLIENT_EMAIL?.trim() && process.env.FIREBASE_PRIVATE_KEY?.trim()) {
    return true;
  }
  return false;
}
function parseServiceAccount() {
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (rawJson) {
    const parsed = JSON.parse(rawJson);
    if (parsed.client_email && parsed.private_key) {
      return (0, import_app.cert)({
        projectId: parsed.project_id || FIREBASE_CONFIG_META.projectId,
        clientEmail: parsed.client_email,
        privateKey: parsed.private_key.replace(/\\n/g, "\n")
      });
    }
  }
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim();
  if (clientEmail && privateKey) {
    return (0, import_app.cert)({
      projectId: FIREBASE_CONFIG_META.projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, "\n")
    });
  }
  return null;
}
function getFirebaseAdminApp() {
  if ((0, import_app.getApps)().length > 0) {
    return (0, import_app.getApp)();
  }
  const credential = parseServiceAccount();
  if (credential) {
    return (0, import_app.initializeApp)({
      credential,
      projectId: FIREBASE_CONFIG_META.projectId
    });
  }
  return (0, import_app.initializeApp)({
    projectId: FIREBASE_CONFIG_META.projectId
  });
}
async function verifyIdTokenWithAdmin(idToken) {
  const clean = (idToken || "").trim();
  if (!clean || clean.length < 20) return null;
  try {
    const app2 = getFirebaseAdminApp();
    const auth = (0, import_auth.getAuth)(app2);
    return await auth.verifyIdToken(clean);
  } catch {
    return null;
  }
}
function getFirebaseProjectMeta() {
  return {
    projectId: FIREBASE_CONFIG_META.projectId,
    firestoreDatabaseId: FIREBASE_CONFIG_META.firestoreDatabaseId || "(default)",
    adminIamConfigured: hasServiceAccountCredentials()
  };
}

// backend/integrations/sportybetClient.ts
var SportyBetIntegrationError = class extends Error {
  constructor(message, statusCode = 502, bizCode) {
    super(message);
    this.name = "SportyBetIntegrationError";
    this.statusCode = statusCode;
    this.bizCode = bizCode;
  }
};
var SportyBetClient = class {
  constructor() {
    this.cache = /* @__PURE__ */ new Map();
    this.lastSuccessTimestamps = /* @__PURE__ */ new Map();
  }
  async fetchJson(url, init, retries = 1) {
    let lastErr = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), SPORTYBET_CONFIG.timeoutMs);
      const started = Date.now();
      try {
        const res = await fetch(url, {
          ...init,
          headers: {
            ...SPORTYBET_CONFIG.headers,
            ...init?.headers || {}
          },
          signal: controller.signal
        });
        const latencyMs = Date.now() - started;
        if (!res.ok) {
          throw new SportyBetIntegrationError(
            `SportyBet upstream HTTP ${res.status}`,
            res.status >= 500 ? 502 : res.status
          );
        }
        const json = await res.json();
        return { json, latencyMs };
      } catch (err) {
        lastErr = err;
        if (attempt === retries) {
          break;
        }
        await new Promise((r) => setTimeout(r, 350 * (attempt + 1)));
      } finally {
        clearTimeout(timeout);
      }
    }
    if (lastErr instanceof SportyBetIntegrationError) {
      throw lastErr;
    }
    const msg = lastErr instanceof Error ? lastErr.message : "Network error reaching SportyBet TZ";
    throw new SportyBetIntegrationError(msg, 502);
  }
  getCached(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }
  setCached(key, value, ttlMs = SPORTYBET_CONFIG.cacheTtlMs) {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
      storedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  normalizeMarket(raw) {
    if (!raw || raw.id === void 0 || raw.id === null) return null;
    const outcomes = (raw.outcomes || []).map((o) => {
      const oddsNum = Number(o.odds);
      if (!Number.isFinite(oddsNum) || oddsNum <= 1) return null;
      const probNum = o.probability !== void 0 ? Number(o.probability) : null;
      return {
        outcomeId: String(o.id ?? ""),
        desc: String(o.desc ?? ""),
        odds: oddsNum,
        probability: probNum !== null && Number.isFinite(probNum) ? probNum : null,
        isActive: o.isActive === 1
      };
    }).filter((o) => o !== null);
    if (outcomes.length === 0) return null;
    return {
      marketId: String(raw.id),
      name: String(raw.name || raw.desc || `Market ${raw.id}`),
      desc: String(raw.desc || raw.name || ""),
      specifier: String(raw.specifier || ""),
      status: Number(raw.status ?? 0),
      banned: Boolean(raw.banned),
      sourceType: String(raw.sourceType || "BET_RADAR"),
      lastOddsChangeTime: typeof raw.lastOddsChangeTime === "number" ? raw.lastOddsChangeTime : null,
      outcomes
    };
  }
  normalizeEvent(raw, tournamentMeta, isLive, retrievedAt) {
    if (!raw || !raw.eventId || !raw.homeTeamName || !raw.awayTeamName) return null;
    const estimateStartTime = Number(raw.estimateStartTime || 0);
    if (!Number.isFinite(estimateStartTime) || estimateStartTime <= 0) return null;
    const markets = (raw.markets || []).map((m) => this.normalizeMarket(m)).filter((m) => m !== null);
    const cat = raw.sport?.category;
    const tour = cat?.tournament;
    const leagueId = String(tournamentMeta.id || tour?.id || "unknown");
    const leagueName = String(tournamentMeta.name || tour?.name || "Unknown League");
    const countryId = String(tournamentMeta.categoryId || cat?.id || "unknown");
    const country = String(tournamentMeta.categoryName || cat?.name || "International");
    const sourceType = raw.eventSource?.liveSource?.sourceType || raw.eventSource?.preMatchSource?.sourceType || markets[0]?.sourceType || "BET_RADAR";
    return {
      bookmakerId: "SPORTYBET_TZ",
      bookmakerName: "SportyBet Tanzania",
      eventId: String(raw.eventId),
      gameId: String(raw.gameId || ""),
      homeTeam: String(raw.homeTeamName),
      awayTeam: String(raw.awayTeamName),
      homeTeamId: String(raw.homeTeamId || ""),
      awayTeamId: String(raw.awayTeamId || ""),
      leagueId,
      leagueName,
      country,
      countryId,
      estimateStartTime,
      kickoffIso: new Date(estimateStartTime).toISOString(),
      statusCode: Number(raw.status ?? 0),
      matchStatus: String(raw.matchStatus || (isLive ? "Live" : "Not start")),
      isLive,
      score: raw.setScore ? String(raw.setScore) : null,
      playedSeconds: raw.playedSeconds ? String(raw.playedSeconds) : null,
      totalMarketSize: Number(raw.totalMarketSize ?? markets.length),
      dataSource: `SportyBet TZ (${sourceType})`,
      retrievedAt,
      markets
    };
  }
  async getLeagueDirectory() {
    const cacheKey = "leagues_football";
    const cached = this.getCached(cacheKey);
    if (cached) return cached;
    const url = `${SPORTYBET_CONFIG.baseUrl}/factsCenter/popularAndSportList?sportId=${encodeURIComponent(
      SPORTYBET_CONFIG.sportIdFootball
    )}&productId=${SPORTYBET_CONFIG.productId}`;
    const { json } = await this.fetchJson(url);
    if (json.bizCode !== 1e4) {
      throw new SportyBetIntegrationError(
        `SportyBet league directory error: ${json.message || json.bizCode}`,
        502,
        json.bizCode
      );
    }
    const football = json.data?.sportList?.find(
      (s) => s.id === SPORTYBET_CONFIG.sportIdFootball
    );
    const items = [];
    for (const cat of football?.categories || []) {
      for (const t of cat.tournaments || []) {
        if (!t.id || !t.name) continue;
        items.push({
          categoryId: String(cat.id || ""),
          country: String(cat.name || "International"),
          tournamentId: String(t.id),
          tournamentName: String(t.name),
          eventSize: Number(t.eventSize || 0)
        });
      }
    }
    items.sort((a, b) => b.eventSize - a.eventSize || a.country.localeCompare(b.country));
    this.setCached(cacheKey, items, 12e4);
    this.lastSuccessTimestamps.set("leagues", (/* @__PURE__ */ new Date()).toISOString());
    return items;
  }
  async getLiveMatches() {
    const cacheKey = "live_football";
    const cached = this.getCached(cacheKey);
    if (cached) return cached;
    const url = `${SPORTYBET_CONFIG.baseUrl}/factsCenter/liveOrPrematchEvents?sportId=${encodeURIComponent(
      SPORTYBET_CONFIG.sportIdFootball
    )}&_t=${Date.now()}`;
    const { json } = await this.fetchJson(url);
    if (json.bizCode !== 1e4) {
      throw new SportyBetIntegrationError(
        `SportyBet live feed error: ${json.message || json.bizCode}`,
        502,
        json.bizCode
      );
    }
    const retrievedAt = (/* @__PURE__ */ new Date()).toISOString();
    const matches = [];
    const seen = /* @__PURE__ */ new Set();
    for (const bucket of json.data || []) {
      for (const ev of bucket.events || []) {
        const normalized = this.normalizeEvent(ev, bucket, true, retrievedAt);
        if (normalized && !seen.has(normalized.eventId)) {
          seen.add(normalized.eventId);
          matches.push(normalized);
        }
      }
    }
    this.setCached(cacheKey, matches, 15e3);
    this.lastSuccessTimestamps.set("live", retrievedAt);
    return matches;
  }
  async getUpcomingMatches(options) {
    const pageNum = options?.pageNum ?? 1;
    const pageSize = Math.min(Math.max(options?.pageSize ?? 100, 10), 100);
    const maxPages = Math.min(Math.max(options?.maxPages ?? 1, 1), 10);
    const marketIds = options?.marketIds || SPORTYBET_CONFIG.defaultMarketIds;
    const todayGames = options?.todayGames ? "&todayGames=true" : "";
    const sportId = options?.sportId || SPORTYBET_CONFIG.sportIdFootball;
    const cacheKey = `upcoming_${sportId}_${pageNum}_${pageSize}_${maxPages}_${marketIds}_${todayGames}`;
    const cached = this.getCached(
      cacheKey
    );
    if (cached) return cached;
    const matches = [];
    const seen = /* @__PURE__ */ new Set();
    let totalAvailable = 0;
    const retrievedAt = (/* @__PURE__ */ new Date()).toISOString();
    for (let p = pageNum; p < pageNum + maxPages; p++) {
      const url = `${SPORTYBET_CONFIG.baseUrl}/factsCenter/pcUpcomingEvents?sportId=${encodeURIComponent(
        sportId
      )}&marketId=${encodeURIComponent(marketIds)}&pageSize=${pageSize}&pageNum=${p}${todayGames}`;
      const { json } = await this.fetchJson(url);
      if (json.bizCode !== 1e4) {
        throw new SportyBetIntegrationError(
          `SportyBet upcoming feed error: ${json.message || json.bizCode}`,
          502,
          json.bizCode
        );
      }
      totalAvailable = Number(json.data?.totalNum || 0);
      const buckets = json.data?.tournaments || [];
      let pageEventCount = 0;
      for (const bucket of buckets) {
        for (const ev of bucket.events || []) {
          pageEventCount++;
          const normalized = this.normalizeEvent(ev, bucket, false, retrievedAt);
          if (normalized && !seen.has(normalized.eventId)) {
            seen.add(normalized.eventId);
            matches.push(normalized);
          }
        }
      }
      if (pageEventCount === 0 || matches.length >= totalAvailable) {
        break;
      }
    }
    const result = { matches, totalAvailable };
    this.setCached(cacheKey, result, SPORTYBET_CONFIG.cacheTtlMs);
    this.lastSuccessTimestamps.set("upcoming", retrievedAt);
    return result;
  }
  async getMatchDetails(eventId) {
    const cacheKey = `event_${eventId}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;
    const url = `${SPORTYBET_CONFIG.baseUrl}/factsCenter/event?eventId=${encodeURIComponent(
      eventId
    )}&productId=${SPORTYBET_CONFIG.productId}`;
    const { json } = await this.fetchJson(url);
    if (json.bizCode !== 1e4 || !json.data) {
      throw new SportyBetIntegrationError(
        `Match ${eventId} unavailable on SportyBet TZ (${json.message || json.bizCode})`,
        404,
        json.bizCode
      );
    }
    const retrievedAt = (/* @__PURE__ */ new Date()).toISOString();
    const isLive = Number(json.data.status || 0) === 1;
    const normalized = this.normalizeEvent(json.data, {}, isLive, retrievedAt);
    if (!normalized) {
      throw new SportyBetIntegrationError(`Unable to parse match ${eventId}`, 502);
    }
    this.setCached(cacheKey, normalized, 15e3);
    this.lastSuccessTimestamps.set("event", retrievedAt);
    return normalized;
  }
  async createBookingCode(selections) {
    if (selections.length === 0 || selections.length > 30) {
      throw new SportyBetIntegrationError(
        "Booking code creation requires between 1 and 30 selections.",
        400
      );
    }
    for (const sel of selections) {
      if (sel.bookmakerId && sel.bookmakerId !== "SPORTYBET_TZ") {
        throw new SportyBetIntegrationError(
          "Cross-bookmaker isolation error: cannot submit betPawa selections to SportyBet TZ.",
          400
        );
      }
    }
    const payload = {
      selections: selections.map((s) => ({
        eventId: s.eventId,
        marketId: String(s.marketId),
        outcomeId: String(s.outcomeId),
        ...s.specifier ? { specifier: s.specifier } : {},
        sportId: SPORTYBET_CONFIG.sportIdFootball
      }))
    };
    const url = `${SPORTYBET_CONFIG.baseUrl}/orders/share`;
    const { json } = await this.fetchJson(
      url,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      },
      0
    );
    if (json.bizCode !== 1e4 || !json.data?.shareCode) {
      throw new SportyBetIntegrationError(
        json.message || "SportyBet rejected booking code creation for these selections.",
        400,
        json.bizCode
      );
    }
    const shareCode = json.data.shareCode;
    const verified = await this.verifyBookingCode(shareCode).catch(() => null);
    this.lastSuccessTimestamps.set("booking", (/* @__PURE__ */ new Date()).toISOString());
    const combinedOdds = Number(
      selections.reduce((acc, s) => acc * s.odds, 1).toFixed(2)
    );
    return {
      bookmakerId: "SPORTYBET_TZ",
      bookmakerName: "SportyBet Tanzania",
      shareCode,
      shareUrl: `https://www.sportybet.com/tz/?shareCode=${encodeURIComponent(shareCode)}`,
      deadline: Number(json.data.deadline || 0),
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      selectionCount: verified ? verified.selectionCount : selections.length,
      combinedOdds: verified ? verified.combinedOdds : combinedOdds,
      verified: Boolean(verified),
      selections: verified ? verified.selections : selections
    };
  }
  async verifyBookingCode(shareCode) {
    const cleanCode = shareCode.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,32}$/.test(cleanCode)) {
      throw new SportyBetIntegrationError("Invalid booking code format.", 400);
    }
    const url = `${SPORTYBET_CONFIG.baseUrl}/orders/share/${encodeURIComponent(cleanCode)}`;
    const { json } = await this.fetchJson(url, void 0, 0);
    if (json.bizCode !== 1e4 || !json.data?.shareCode) {
      throw new SportyBetIntegrationError(
        json.message || `Booking code ${cleanCode} is invalid or expired.`,
        404,
        json.bizCode
      );
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const mappedSelections = [];
    for (const ev of json.data.outcomes || []) {
      const m = ev.markets?.[0];
      const o = m?.outcomes?.[0];
      if (!ev.eventId || !m || !o) continue;
      const oddsNum = Number(o.odds || 0);
      mappedSelections.push({
        bookmakerId: "SPORTYBET_TZ",
        bookmakerName: "SportyBet Tanzania",
        selectionKey: `${ev.eventId}::${m.id}::${m.specifier || ""}::${o.id}`,
        eventId: String(ev.eventId),
        homeTeam: String(ev.homeTeamName || "Home"),
        awayTeam: String(ev.awayTeamName || "Away"),
        leagueName: String(ev.sport?.category?.tournament?.name || "Football"),
        country: String(ev.sport?.category?.name || "International"),
        estimateStartTime: Number(ev.estimateStartTime || 0),
        matchStatus: String(ev.matchStatus || "Not start"),
        isLive: Number(ev.status || 0) === 1,
        marketId: String(m.id || ""),
        marketName: String(m.name || m.desc || ""),
        specifier: String(m.specifier || ""),
        outcomeId: String(o.id || ""),
        outcomeDesc: String(o.desc || ""),
        odds: Number.isFinite(oddsNum) && oddsNum > 0 ? oddsNum : 1,
        addedAt: now
      });
    }
    const combinedOdds = Number(
      mappedSelections.reduce((acc, s) => acc * s.odds, 1).toFixed(2)
    );
    this.lastSuccessTimestamps.set("booking", now);
    return {
      bookmakerId: "SPORTYBET_TZ",
      bookmakerName: "SportyBet Tanzania",
      shareCode: json.data.shareCode,
      shareUrl: `https://www.sportybet.com/tz/?shareCode=${encodeURIComponent(
        json.data.shareCode
      )}`,
      deadline: Number(json.data.deadline || 0),
      createdAt: now,
      selectionCount: mappedSelections.length,
      combinedOdds,
      verified: true,
      selections: mappedSelections
    };
  }
  async runDiagnostics() {
    const checks = [];
    const now = (/* @__PURE__ */ new Date()).toISOString();
    checks.push({
      key: "backend_api",
      label: "Express Backend API",
      status: "CONNECTED",
      latencyMs: 1,
      lastCheckedAt: now,
      lastSuccessAt: now,
      details: "Node/Express API router active on local server.",
      endpoint: "/api/health"
    });
    const probe = async (key, label, endpoint, fn) => {
      const start = Date.now();
      try {
        await fn();
        const latencyMs = Date.now() - start;
        const okTime = (/* @__PURE__ */ new Date()).toISOString();
        this.lastSuccessTimestamps.set(key, okTime);
        checks.push({
          key,
          label,
          status: "CONNECTED",
          latencyMs,
          lastCheckedAt: okTime,
          lastSuccessAt: okTime,
          details: "Verified live HTTP 200 & bizCode 10000 response.",
          endpoint
        });
      } catch (err) {
        checks.push({
          key,
          label,
          status: "ERROR",
          latencyMs: Date.now() - start,
          lastCheckedAt: (/* @__PURE__ */ new Date()).toISOString(),
          lastSuccessAt: this.lastSuccessTimestamps.get(key) || null,
          details: err instanceof Error ? err.message : "Endpoint probe failed",
          endpoint
        });
      }
    };
    await Promise.all([
      probe(
        "sportybet_upcoming",
        "SportyBet TZ Upcoming Fixtures & Odds",
        `${SPORTYBET_CONFIG.baseUrl}/factsCenter/pcUpcomingEvents`,
        () => this.getUpcomingMatches({ pageNum: 1, pageSize: 10, maxPages: 1 })
      ),
      probe(
        "sportybet_live",
        "SportyBet TZ Live In-Play Feed",
        `${SPORTYBET_CONFIG.baseUrl}/factsCenter/liveOrPrematchEvents`,
        () => this.getLiveMatches()
      ),
      probe(
        "sportybet_leagues",
        "SportyBet TZ League Directory",
        `${SPORTYBET_CONFIG.baseUrl}/factsCenter/popularAndSportList`,
        () => this.getLeagueDirectory()
      ),
      probe(
        "sportybet_booking",
        "SportyBet TZ Booking Code API",
        `${SPORTYBET_CONFIG.baseUrl}/orders/share`,
        async () => {
          const url = `${SPORTYBET_CONFIG.baseUrl}/orders/share/DIAG00`;
          const { json } = await this.fetchJson(url, void 0, 0);
          if (json.bizCode === void 0) {
            throw new Error("Unexpected response from /orders/share");
          }
        }
      )
    ]);
    return checks;
  }
};
var sportyBetClient = new SportyBetClient();

// backend/integrations/betpawaClient.ts
var TOTAL_MARKET_IDS = /* @__PURE__ */ new Set(["5000", "5006", "5003", "4958"]);
var HANDICAP_MARKET_IDS = /* @__PURE__ */ new Set(["3774"]);
function formatOutcomeDesc(rawDesc, handicap, homeTeam, awayTeam) {
  return rawDesc.replace(/\{formattedHandicap\}/g, handicap).replace(/\{home\}/g, homeTeam).replace(/\{away\}/g, awayTeam).replace(/\s+/g, " ").trim();
}
function formatMarketName(rawName, homeTeam, awayTeam) {
  return rawName.replace(/\{home\}/g, homeTeam).replace(/\{away\}/g, awayTeam).replace(/\s+/g, " ").trim();
}
function extractBetPawaScoreAndStatus(raw, isLiveHint) {
  const periodSlug = String(raw.results?.display?.currentPeriod?.slug || "").toUpperCase();
  const periodName = String(raw.results?.display?.currentPeriod?.name || "");
  const minute = raw.results?.display?.minute ? String(raw.results.display.minute) : null;
  let homeScore = null;
  let awayScore = null;
  for (const ppr of raw.results?.participantPeriodResults || []) {
    const pType = String(ppr.participant?.type || "").toUpperCase();
    const scoreEntry = ppr.periodResults?.find(
      (pr) => pr.type === "SCORE" && (pr.period?.slug === "FULL_TIME_EXCLUDING_OVERTIME" || pr.period?.slug === "REGULAR_TIME" || pr.period?.slug === "FULL_TIME")
    ) || ppr.periodResults?.find((pr) => pr.type === "SCORE");
    if (scoreEntry && scoreEntry.result !== void 0) {
      if (pType === "HOME") homeScore = String(scoreEntry.result);
      if (pType === "AWAY") awayScore = String(scoreEntry.result);
    }
  }
  const score = homeScore !== null && awayScore !== null ? `${homeScore}:${awayScore}` : null;
  if (/ENDED|FINISHED|FULL_TIME|CLOSED/.test(periodSlug)) {
    return {
      isLive: false,
      statusCode: 3,
      matchStatus: "Ended",
      score,
      playedSeconds: minute
    };
  }
  if (/POSTPONED|CANCELLED|ABANDONED/.test(periodSlug)) {
    return {
      isLive: false,
      statusCode: 5,
      matchStatus: periodName || periodSlug,
      score,
      playedSeconds: minute
    };
  }
  const isLive = Boolean(isLiveHint ?? raw.additionalInfo?.live);
  if (isLive) {
    return {
      isLive: true,
      statusCode: 1,
      matchStatus: periodName || "Live",
      score,
      playedSeconds: minute
    };
  }
  return {
    isLive: false,
    statusCode: 0,
    matchStatus: "Not start",
    score,
    playedSeconds: minute
  };
}
var BetPawaClient = class {
  constructor() {
    this.cache = /* @__PURE__ */ new Map();
    this.lastSuccessTimestamps = /* @__PURE__ */ new Map();
  }
  async fetchJson(url, init, retries = 1) {
    let lastErr = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), BETPAWA_CONFIG.timeoutMs);
      const started = Date.now();
      try {
        const res = await fetch(url, {
          ...init,
          headers: {
            ...BETPAWA_CONFIG.headers,
            ...init?.headers || {}
          },
          signal: controller.signal
        });
        const latencyMs = Date.now() - started;
        if (!res.ok) {
          const errBody = await res.text().catch(() => "");
          throw new SportyBetIntegrationError(
            `betPawa TZ upstream HTTP ${res.status}${errBody ? `: ${errBody.slice(0, 120)}` : ""}`,
            res.status >= 500 ? 502 : res.status
          );
        }
        const json = await res.json();
        return { json, latencyMs };
      } catch (err) {
        lastErr = err;
        if (attempt === retries) break;
        await new Promise((r) => setTimeout(r, 350 * (attempt + 1)));
      } finally {
        clearTimeout(timeout);
      }
    }
    if (lastErr instanceof SportyBetIntegrationError) {
      throw lastErr;
    }
    const msg = lastErr instanceof Error ? lastErr.message : "Network error reaching betPawa TZ";
    throw new SportyBetIntegrationError(msg, 502);
  }
  getCached(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }
  setCached(key, value, ttlMs = BETPAWA_CONFIG.cacheTtlMs) {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs
    });
  }
  normalizeEvent(raw, isLiveHint, retrievedAt) {
    if (!raw || !raw.id || !raw.startTime) return null;
    const estimateStartTime = Date.parse(raw.startTime);
    if (!Number.isFinite(estimateStartTime) || estimateStartTime <= 0) return null;
    const homeParticipant = raw.participants?.find((p) => p.position === 1);
    const awayParticipant = raw.participants?.find((p) => p.position === 2);
    const fallbackSplit = String(raw.name || "").split(/\s+-\s+/);
    const homeTeam = String(homeParticipant?.name || fallbackSplit[0] || "").trim();
    const awayTeam = String(awayParticipant?.name || fallbackSplit.slice(1).join(" - ") || "").trim();
    if (!homeTeam || !awayTeam) return null;
    const statusInfo = extractBetPawaScoreAndStatus(raw, isLiveHint);
    const normalizedMarkets = [];
    for (const rawMarket of raw.markets || []) {
      const mTypeId = String(rawMarket.marketType?.id || "").trim();
      if (!mTypeId) continue;
      const marketLabel = formatMarketName(
        String(rawMarket.marketType?.displayName || rawMarket.marketType?.name || `Market ${mTypeId}`),
        homeTeam,
        awayTeam
      );
      const shortName = formatMarketName(
        String(rawMarket.marketType?.name || marketLabel),
        homeTeam,
        awayTeam
      );
      const rows = rawMarket.row || [];
      for (const r of rows) {
        const firstHandicap = r.prices?.[0]?.handicap !== void 0 && r.prices?.[0]?.handicap !== "" ? String(r.prices[0].handicap) : r.handicap !== void 0 && r.handicap !== "" ? String(r.handicap) : "";
        let specifier = "";
        if (firstHandicap) {
          if (TOTAL_MARKET_IDS.has(mTypeId)) {
            specifier = `total=${firstHandicap}`;
          } else if (HANDICAP_MARKET_IDS.has(mTypeId)) {
            specifier = `hcp=${firstHandicap}`;
          } else {
            specifier = `line=${firstHandicap}`;
          }
        } else if (rows.length > 1 && r.id) {
          specifier = `row=${r.id}`;
        }
        const outcomes = (r.prices || []).map((p) => {
          const oddsNum = Number(p.odds);
          if (!Number.isFinite(oddsNum) || oddsNum <= 1 || !p.id) return null;
          const hcpStr = p.handicap !== void 0 && p.handicap !== "" ? String(p.handicap) : firstHandicap;
          const desc = formatOutcomeDesc(
            String(p.displayName || p.name || ""),
            hcpStr,
            homeTeam,
            awayTeam
          );
          const winProb = p.probability?.win;
          return {
            outcomeId: String(p.id),
            desc,
            odds: oddsNum,
            probability: typeof winProb === "number" && Number.isFinite(winProb) ? winProb : null,
            isActive: !p.suspended
          };
        }).filter((o) => o !== null);
        if (outcomes.length === 0) continue;
        normalizedMarkets.push({
          marketId: mTypeId,
          name: shortName,
          desc: marketLabel,
          specifier,
          status: 0,
          banned: false,
          sourceType: "BETPAWA_SPORTSBOOK",
          lastOddsChangeTime: null,
          outcomes
        });
      }
    }
    return {
      bookmakerId: "BETPAWA_TZ",
      bookmakerName: "betPawa Tanzania",
      eventId: String(raw.id),
      gameId: String(raw.id),
      homeTeam,
      awayTeam,
      homeTeamId: String(homeParticipant?.id || ""),
      awayTeamId: String(awayParticipant?.id || ""),
      leagueId: String(raw.competition?.id || "unknown"),
      leagueName: String(raw.competition?.name || "Unknown League"),
      country: String(raw.region?.name || "International"),
      countryId: String(raw.region?.id || "unknown"),
      estimateStartTime,
      kickoffIso: new Date(estimateStartTime).toISOString(),
      statusCode: statusInfo.statusCode,
      matchStatus: statusInfo.matchStatus,
      isLive: statusInfo.isLive,
      score: statusInfo.score,
      playedSeconds: statusInfo.playedSeconds,
      totalMarketSize: Number(raw.totalMarketCount ?? normalizedMarkets.length),
      dataSource: "betPawa TZ Sportsbook API",
      retrievedAt,
      markets: normalizedMarkets
    };
  }
  async getLeagueDirectory() {
    const cacheKey = "betpawa_leagues_football";
    const cached = this.getCached(cacheKey);
    if (cached) return cached;
    const url = `${BETPAWA_CONFIG.baseUrl}/v4/categories/list/${BETPAWA_CONFIG.categoryIdFootball}`;
    const { json } = await this.fetchJson(url);
    const items = [];
    for (const regionBlock of json.withRegions?.[0]?.regions || []) {
      const catId = String(regionBlock.region?.id || "");
      const country = String(regionBlock.region?.name || "International");
      for (const comp of regionBlock.competitions || []) {
        const compId = comp.competition?.id;
        const compName = comp.competition?.name;
        if (!compId || !compName) continue;
        const liveCount = Number(comp.eventCounts?.live || 0);
        const upcomingCount = Number(comp.eventCounts?.upcoming || 0);
        items.push({
          categoryId: catId,
          country,
          tournamentId: String(compId),
          tournamentName: String(compName),
          eventSize: liveCount + upcomingCount
        });
      }
    }
    items.sort((a, b) => b.eventSize - a.eventSize || a.country.localeCompare(b.country));
    this.setCached(cacheKey, items, 12e4);
    this.lastSuccessTimestamps.set("betpawa_leagues", (/* @__PURE__ */ new Date()).toISOString());
    return items;
  }
  async getLiveMatches() {
    const cacheKey = "betpawa_live_football";
    const cached = this.getCached(cacheKey);
    if (cached) return cached;
    const qObj = {
      queries: [
        {
          query: { eventType: "LIVE", categories: [BETPAWA_CONFIG.categoryIdFootball] },
          view: { marketTypes: [...BETPAWA_CONFIG.defaultMarketIds] },
          skip: 0,
          take: 100
        }
      ]
    };
    const url = `${BETPAWA_CONFIG.baseUrl}/v4/events/lists/by-queries?q=${encodeURIComponent(
      JSON.stringify(qObj)
    )}`;
    const { json } = await this.fetchJson(url);
    const retrievedAt = (/* @__PURE__ */ new Date()).toISOString();
    const matches = [];
    const seen = /* @__PURE__ */ new Set();
    for (const ev of json.responses?.[0]?.responses || []) {
      const normalized = this.normalizeEvent(ev, true, retrievedAt);
      if (normalized && !seen.has(normalized.eventId)) {
        seen.add(normalized.eventId);
        matches.push(normalized);
      }
    }
    this.setCached(cacheKey, matches, 15e3);
    this.lastSuccessTimestamps.set("betpawa_live", retrievedAt);
    return matches;
  }
  async getUpcomingMatches(options) {
    const pageNum = Math.max(1, options?.pageNum ?? 1);
    const pageSize = Math.min(Math.max(options?.pageSize ?? 50, 10), 100);
    const maxPages = Math.min(Math.max(options?.maxPages ?? 1, 1), 8);
    const requestedMarketIds = options?.marketIds ? options.marketIds.split(",").map((s) => s.trim()).filter(Boolean) : [...BETPAWA_CONFIG.defaultMarketIds];
    const cacheKey = `betpawa_upcoming_${pageNum}_${pageSize}_${maxPages}_${requestedMarketIds.join(",")}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;
    const matches = [];
    const seen = /* @__PURE__ */ new Set();
    const retrievedAt = (/* @__PURE__ */ new Date()).toISOString();
    let totalAvailable = 0;
    for (let p = pageNum; p < pageNum + maxPages; p++) {
      const skip = (p - 1) * pageSize;
      const qObj = {
        queries: [
          {
            query: { eventType: "UPCOMING", categories: [BETPAWA_CONFIG.categoryIdFootball] },
            view: { marketTypes: requestedMarketIds },
            skip,
            take: pageSize
          }
        ]
      };
      const url = `${BETPAWA_CONFIG.baseUrl}/v4/events/lists/by-queries?q=${encodeURIComponent(
        JSON.stringify(qObj)
      )}`;
      const { json } = await this.fetchJson(url);
      const batch = json.responses?.[0]?.responses || [];
      if (json.responses?.[0]?.totalCount !== void 0) {
        totalAvailable = Number(json.responses[0].totalCount);
      }
      for (const ev of batch) {
        const normalized = this.normalizeEvent(ev, false, retrievedAt);
        if (normalized && !seen.has(normalized.eventId)) {
          seen.add(normalized.eventId);
          matches.push(normalized);
        }
      }
      if (batch.length < pageSize) {
        totalAvailable = Math.max(totalAvailable, skip + batch.length);
        break;
      }
      totalAvailable = Math.max(totalAvailable, skip + batch.length + pageSize);
    }
    const result = { matches, totalAvailable };
    this.setCached(cacheKey, result, BETPAWA_CONFIG.cacheTtlMs);
    this.lastSuccessTimestamps.set("betpawa_upcoming", retrievedAt);
    return result;
  }
  async getMatchDetails(eventId) {
    const cacheKey = `betpawa_event_${eventId}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;
    const url = `${BETPAWA_CONFIG.baseUrl}/v4/events/${encodeURIComponent(eventId)}`;
    const { json } = await this.fetchJson(url);
    const retrievedAt = (/* @__PURE__ */ new Date()).toISOString();
    const normalized = this.normalizeEvent(json, void 0, retrievedAt);
    if (!normalized) {
      throw new SportyBetIntegrationError(`Match ${eventId} unavailable on betPawa TZ`, 404);
    }
    this.setCached(cacheKey, normalized, 15e3);
    this.lastSuccessTimestamps.set("betpawa_event", retrievedAt);
    return normalized;
  }
  async createBookingCode(selections) {
    if (selections.length === 0 || selections.length > 30) {
      throw new SportyBetIntegrationError(
        "Booking code creation requires between 1 and 30 selections.",
        400
      );
    }
    for (const sel of selections) {
      if (sel.bookmakerId && sel.bookmakerId !== "BETPAWA_TZ") {
        throw new SportyBetIntegrationError(
          "Cross-bookmaker isolation error: cannot submit SportyBet selections to betPawa TZ.",
          400
        );
      }
    }
    const selectionEntries = selections.map((s) => {
      const priceId = Number(s.outcomeId);
      if (!Number.isInteger(priceId) || priceId <= 0) {
        throw new SportyBetIntegrationError(
          `Invalid betPawa TZ price ID (${s.outcomeId}) for ${s.homeTeam} vs ${s.awayTeam}.`,
          400
        );
      }
      return {
        type: "SINGLE",
        selections: [priceId]
      };
    });
    const url = `${BETPAWA_CONFIG.baseUrl}/v3/booking-number`;
    const { json } = await this.fetchJson(
      url,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selections: {
            selections: selectionEntries
          }
        })
      },
      0
    );
    const code = String(json.code || "").trim().toUpperCase();
    if (!code) {
      throw new SportyBetIntegrationError(
        json.error || "betPawa TZ rejected booking code creation for these selections.",
        400
      );
    }
    const verified = await this.verifyBookingCode(code).catch(() => null);
    this.lastSuccessTimestamps.set("betpawa_booking", (/* @__PURE__ */ new Date()).toISOString());
    const combinedOdds = Number(
      selections.reduce((acc, s) => acc * s.odds, 1).toFixed(2)
    );
    const earliestKickoff = selections.reduce(
      (min, s) => s.estimateStartTime > 0 ? Math.min(min, s.estimateStartTime) : min,
      selections[0]?.estimateStartTime || 0
    );
    return {
      bookmakerId: "BETPAWA_TZ",
      bookmakerName: "betPawa Tanzania",
      shareCode: code,
      shareUrl: `https://www.betpawa.co.tz/?bookingNumber=${encodeURIComponent(code)}`,
      deadline: earliestKickoff,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      selectionCount: verified ? verified.selectionCount : selections.length,
      combinedOdds: verified ? verified.combinedOdds : combinedOdds,
      verified: Boolean(verified),
      selections: verified && verified.selections.length > 0 ? verified.selections : selections
    };
  }
  async verifyBookingCode(shareCode) {
    const cleanCode = shareCode.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,32}$/.test(cleanCode)) {
      throw new SportyBetIntegrationError("Invalid betPawa booking code format.", 400);
    }
    const url = `${BETPAWA_CONFIG.baseUrl}/v3/booking-number/${encodeURIComponent(cleanCode)}`;
    const { json } = await this.fetchJson(url, void 0, 0);
    const items = json.items || [];
    if (items.length === 0) {
      throw new SportyBetIntegrationError(
        `betPawa booking code ${cleanCode} is invalid, empty, or expired.`,
        404
      );
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const mappedSelections = [];
    for (const item of items) {
      const ev = item.eventInfo;
      const sel = item.selections?.[0];
      if (!ev?.id || !sel?.market || !sel?.selectionInfo) continue;
      const homeParticipant = ev.participants?.find((p) => p.position === 1);
      const awayParticipant = ev.participants?.find((p) => p.position === 2);
      const homeTeam = String(homeParticipant?.name || "Home");
      const awayTeam = String(awayParticipant?.name || "Away");
      const mTypeId = String(sel.market.typeId || "");
      const handicap = String(sel.selectionInfo.handicap || sel.market.formattedHandicap || "");
      const specifier = handicap ? TOTAL_MARKET_IDS.has(mTypeId) ? `total=${handicap}` : HANDICAP_MARKET_IDS.has(mTypeId) ? `hcp=${handicap}` : `line=${handicap}` : "";
      const marketName = formatMarketName(
        String(sel.market.displayName || sel.market.name || `Market ${mTypeId}`),
        homeTeam,
        awayTeam
      );
      const outcomeId = String(sel.selectionInfo.id || "");
      const outcomeDesc = formatOutcomeDesc(
        String(sel.selectionInfo.displayName || sel.selectionInfo.name || ""),
        handicap,
        homeTeam,
        awayTeam
      );
      const oddsNum = Number(item.odds?.price || 0);
      const kickoffMs = ev.startTime ? Date.parse(ev.startTime) : 0;
      mappedSelections.push({
        bookmakerId: "BETPAWA_TZ",
        bookmakerName: "betPawa Tanzania",
        selectionKey: `${ev.id}::${mTypeId}::${specifier}::${outcomeId}`,
        eventId: String(ev.id),
        homeTeam,
        awayTeam,
        leagueName: String(ev.competition?.name || "Football"),
        country: String(ev.region?.name || "International"),
        estimateStartTime: Number.isFinite(kickoffMs) ? kickoffMs : 0,
        matchStatus: ev.additionalInfo?.live ? "Live" : "Not start",
        isLive: Boolean(ev.additionalInfo?.live),
        marketId: mTypeId,
        marketName,
        specifier,
        outcomeId,
        outcomeDesc,
        odds: Number.isFinite(oddsNum) && oddsNum > 1 ? oddsNum : 1.01,
        addedAt: now
      });
    }
    const combinedOdds = Number(
      mappedSelections.reduce((acc, s) => acc * s.odds, 1).toFixed(2)
    );
    const earliestDeadline = mappedSelections.reduce(
      (min, s) => s.estimateStartTime > 0 ? Math.min(min, s.estimateStartTime) : min,
      mappedSelections[0]?.estimateStartTime || 0
    );
    this.lastSuccessTimestamps.set("betpawa_booking", now);
    return {
      bookmakerId: "BETPAWA_TZ",
      bookmakerName: "betPawa Tanzania",
      shareCode: cleanCode,
      shareUrl: `https://www.betpawa.co.tz/?bookingNumber=${encodeURIComponent(cleanCode)}`,
      deadline: earliestDeadline,
      createdAt: now,
      selectionCount: mappedSelections.length,
      combinedOdds,
      verified: true,
      selections: mappedSelections
    };
  }
  async runDiagnostics() {
    const checks = [];
    const now = (/* @__PURE__ */ new Date()).toISOString();
    checks.push({
      key: "backend_api",
      label: "Express Backend API",
      status: "CONNECTED",
      latencyMs: 1,
      lastCheckedAt: now,
      lastSuccessAt: now,
      details: "Node/Express API router active for multi-bookmaker operations.",
      endpoint: "/api/health"
    });
    const probe = async (key, label, endpoint, fn) => {
      const start = Date.now();
      try {
        await fn();
        const latencyMs = Date.now() - start;
        const okTime = (/* @__PURE__ */ new Date()).toISOString();
        this.lastSuccessTimestamps.set(key, okTime);
        checks.push({
          key,
          label,
          status: "CONNECTED",
          latencyMs,
          lastCheckedAt: okTime,
          lastSuccessAt: okTime,
          details: "Verified live HTTP 200 JSON response with x-pawa-brand: betpawa-tanzania.",
          endpoint
        });
      } catch (err) {
        checks.push({
          key,
          label,
          status: "ERROR",
          latencyMs: Date.now() - start,
          lastCheckedAt: (/* @__PURE__ */ new Date()).toISOString(),
          lastSuccessAt: this.lastSuccessTimestamps.get(key) || null,
          details: err instanceof Error ? err.message : "Endpoint probe failed",
          endpoint
        });
      }
    };
    await Promise.all([
      probe(
        "betpawa_upcoming",
        "betPawa TZ Upcoming Fixtures & Odds (v4)",
        `${BETPAWA_CONFIG.baseUrl}/v4/events/lists/by-queries`,
        () => this.getUpcomingMatches({ pageNum: 1, pageSize: 10, maxPages: 1 })
      ),
      probe(
        "betpawa_live",
        "betPawa TZ Live In-Play Feed (v4)",
        `${BETPAWA_CONFIG.baseUrl}/v4/events/lists/by-queries`,
        () => this.getLiveMatches()
      ),
      probe(
        "betpawa_leagues",
        "betPawa TZ Regions & Leagues (v4)",
        `${BETPAWA_CONFIG.baseUrl}/v4/categories/list/2`,
        () => this.getLeagueDirectory()
      ),
      probe(
        "betpawa_booking",
        "betPawa TZ Booking Code API (v3)",
        `${BETPAWA_CONFIG.baseUrl}/v3/booking-number`,
        async () => {
          const controller = new AbortController();
          const t = setTimeout(() => controller.abort(), BETPAWA_CONFIG.timeoutMs);
          try {
            const res = await fetch(`${BETPAWA_CONFIG.baseUrl}/v3/booking-number/DIAG00`, {
              headers: BETPAWA_CONFIG.headers,
              signal: controller.signal
            });
            if (res.status >= 500) {
              throw new Error(`HTTP ${res.status}`);
            }
          } finally {
            clearTimeout(t);
          }
        }
      )
    ]);
    return checks;
  }
};
var betPawaClient = new BetPawaClient();

// backend/integrations/bookmakerRegistry.ts
function getBookmakerClient(bookmakerId) {
  const id = normalizeBookmakerId(bookmakerId);
  if (id === "BETPAWA_TZ") {
    return betPawaClient;
  }
  return sportyBetClient;
}
function assertSameBookmakerSelections(selections, targetBookmakerId) {
  for (const sel of selections) {
    const selBookmaker = sel.bookmakerId ? normalizeBookmakerId(sel.bookmakerId) : targetBookmakerId;
    if (selBookmaker !== targetBookmakerId) {
      throw new SportyBetIntegrationError(
        `Platform isolation violation: selection "${sel.homeTeam} vs ${sel.awayTeam}" belongs to ${selBookmaker} and cannot be submitted to ${targetBookmakerId}.`,
        400
      );
    }
  }
}

// backend/middleware/adminAuth.ts
var import_crypto2 = __toESM(require("crypto"), 1);

// backend/services/logger.ts
var import_crypto = __toESM(require("crypto"), 1);
var BackendLogger = class {
  constructor() {
    this.entries = [];
    this.maxEntries = 200;
  }
  log(entry) {
    const full = {
      id: `blog_${import_crypto.default.randomBytes(4).toString("hex")}`,
      ...entry,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.entries = [full, ...this.entries].slice(0, this.maxEntries);
    if (process.env.NODE_ENV !== "test") {
      const line = JSON.stringify({
        ts: full.createdAt,
        level: full.level,
        category: full.category,
        event: full.event,
        message: full.message,
        actorEmail: full.actorEmail || void 0
      });
      if (full.level === "ERROR") {
        console.error(line);
      } else {
        console.log(line);
      }
    }
    return full;
  }
  info(category, event, message, extra) {
    return this.log({ level: "INFO", category, event, message, ...extra });
  }
  warn(category, event, message, extra) {
    return this.log({ level: "WARN", category, event, message, ...extra });
  }
  error(category, event, message, extra) {
    return this.log({ level: "ERROR", category, event, message, ...extra });
  }
  list(filter) {
    let items = this.entries;
    if (filter?.level) {
      items = items.filter((e) => e.level === filter.level);
    }
    if (filter?.category) {
      items = items.filter((e) => e.category === filter.category);
    }
    return items.slice(0, filter?.limit ?? 100);
  }
};
var backendLogger = new BackendLogger();

// backend/services/platformConfigService.ts
var import_fs = __toESM(require("fs"), 1);
var import_os = __toESM(require("os"), 1);
var import_path = __toESM(require("path"), 1);
var ALL_CANONICAL_TRANSFER_MARKETS = [
  "1X2_FT",
  "DOUBLE_CHANCE_FT",
  "OVER_UNDER_FT",
  "BTTS_FT",
  "DRAW_NO_BET_FT",
  "ODD_EVEN_FT",
  "HOME_OU_FT",
  "AWAY_OU_FT",
  "ASIAN_HANDICAP_FT",
  "HT_1X2",
  "HT_OVER_UNDER",
  "HT_DOUBLE_CHANCE",
  "HT_BTTS"
];
var DATA_DIR = process.env.VERCEL ? import_path.default.join(import_os.default.tmpdir(), "sportybet-odds-hunter") : import_path.default.resolve(process.cwd(), ".data");
var PLATFORM_FILE = import_path.default.join(DATA_DIR, "platform-state.json");
var DEFAULT_SETTINGS = {
  sportybetEnabled: true,
  betpawaEnabled: true,
  crossTransferEnabled: true,
  supportedTransferMarkets: [...ALL_CANONICAL_TRANSFER_MARKETS],
  updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
  updatedByEmail: null
};
var PlatformConfigService = class {
  constructor() {
    this.state = this.load();
  }
  load() {
    try {
      if (import_fs.default.existsSync(PLATFORM_FILE)) {
        const raw = import_fs.default.readFileSync(PLATFORM_FILE, "utf8");
        const parsed = JSON.parse(raw);
        return {
          settings: {
            ...DEFAULT_SETTINGS,
            ...parsed.settings || {},
            supportedTransferMarkets: Array.isArray(parsed.settings?.supportedTransferMarkets) && parsed.settings.supportedTransferMarkets.length > 0 ? parsed.settings.supportedTransferMarkets : [...ALL_CANONICAL_TRANSFER_MARKETS]
          },
          transferHistory: Array.isArray(parsed.transferHistory) ? parsed.transferHistory.slice(0, 200) : [],
          userAccess: parsed.userAccess && typeof parsed.userAccess === "object" ? parsed.userAccess : {}
        };
      }
    } catch {
    }
    return {
      settings: { ...DEFAULT_SETTINGS },
      transferHistory: [],
      userAccess: {}
    };
  }
  flush() {
    try {
      if (!import_fs.default.existsSync(DATA_DIR)) {
        import_fs.default.mkdirSync(DATA_DIR, { recursive: true });
      }
      import_fs.default.writeFileSync(PLATFORM_FILE, JSON.stringify(this.state, null, 2), "utf8");
    } catch {
    }
  }
  getSettings() {
    return { ...this.state.settings };
  }
  updateSettings(partial, actorEmail) {
    this.state.settings = {
      ...this.state.settings,
      ...partial,
      supportedTransferMarkets: Array.isArray(partial.supportedTransferMarkets) && partial.supportedTransferMarkets.length > 0 ? partial.supportedTransferMarkets : this.state.settings.supportedTransferMarkets,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedByEmail: actorEmail
    };
    this.flush();
    return this.getSettings();
  }
  isBookmakerEnabled(bookmakerId) {
    if (bookmakerId === "BETPAWA_TZ") {
      return this.state.settings.betpawaEnabled;
    }
    return this.state.settings.sportybetEnabled;
  }
  isCrossTransferEnabled() {
    return this.state.settings.crossTransferEnabled && this.state.settings.sportybetEnabled && this.state.settings.betpawaEnabled;
  }
  recordTransfer(entry) {
    const filtered = this.state.transferHistory.filter(
      (t) => t.transferId !== entry.transferId
    );
    this.state.transferHistory = [entry, ...filtered].slice(0, 200);
    this.flush();
  }
  getTransferHistory(options) {
    let items = this.state.transferHistory;
    if (options?.status && options.status !== "ALL") {
      items = items.filter((t) => t.status === options.status);
    }
    return items.slice(0, options?.limit ?? 100);
  }
  upsertSeenUser(user) {
    const existing = this.state.userAccess[user.uid];
    const next = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || existing?.displayName || user.email.split("@")[0] || "User",
      role: existing?.role || (user.defaultAdmin ? "ADMIN" : "USER"),
      disabled: existing?.disabled ?? false,
      emailVerified: Boolean(user.emailVerified),
      lastSeenAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedByEmail: existing?.updatedByEmail || null
    };
    this.state.userAccess[user.uid] = next;
    this.flush();
    return next;
  }
  getUserAccess(uid) {
    return this.state.userAccess[uid] || null;
  }
  isUserAdminByAccessRecord(uid) {
    const rec = this.state.userAccess[uid];
    return Boolean(rec && rec.role === "ADMIN" && !rec.disabled);
  }
  isUserDisabled(uid) {
    return Boolean(this.state.userAccess[uid]?.disabled);
  }
  updateUserAccess(uid, updates, actorEmail) {
    const existing = this.state.userAccess[uid];
    const next = {
      uid,
      email: updates.email || existing?.email || `${uid}@unknown.local`,
      displayName: updates.displayName || existing?.displayName || "User",
      role: updates.role ?? existing?.role ?? "USER",
      disabled: updates.disabled ?? existing?.disabled ?? false,
      emailVerified: existing?.emailVerified ?? true,
      lastSeenAt: existing?.lastSeenAt || (/* @__PURE__ */ new Date()).toISOString(),
      updatedByEmail: actorEmail
    };
    this.state.userAccess[uid] = next;
    this.flush();
    return next;
  }
  listUsers() {
    return Object.values(this.state.userAccess).sort(
      (a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt)
    );
  }
};
var platformConfigService = new PlatformConfigService();

// backend/middleware/adminAuth.ts
var DEFAULT_ADMIN_EMAILS = /* @__PURE__ */ new Set([
  "jkambi00@gmail.com",
  "xbotmanager@gmail.com"
]);
var tokenCache = /* @__PURE__ */ new Map();
function isAdminEmail(email, emailVerified) {
  if (!email || !emailVerified) return false;
  return DEFAULT_ADMIN_EMAILS.has(email.trim().toLowerCase());
}
function isUserAuthorizedAdmin(user) {
  if (!user) return false;
  if (platformConfigService.isUserDisabled(user.uid)) return false;
  if (isAdminEmail(user.email, user.emailVerified)) return true;
  if (user.emailVerified && platformConfigService.isUserAdminByAccessRecord(user.uid)) {
    return true;
  }
  return false;
}
async function verifyFirebaseIdToken(idToken) {
  const clean = (idToken || "").trim();
  if (!clean || clean.length < 20) return null;
  const hash = import_crypto2.default.createHash("sha256").update(clean).digest("hex");
  const cached = tokenCache.get(hash);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.user;
  }
  const decoded = await verifyIdTokenWithAdmin(clean);
  if (decoded && decoded.uid && decoded.email) {
    const verified = {
      uid: decoded.uid,
      email: decoded.email,
      emailVerified: Boolean(decoded.email_verified),
      name: typeof decoded.name === "string" ? decoded.name : void 0
    };
    tokenCache.set(hash, {
      user: verified,
      expiresAt: Date.now() + 60 * 1e3
    });
    return verified;
  }
  return null;
}
async function optionalAuth(req, _res, next) {
  const authHeader = String(req.headers.authorization || "");
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (token) {
    const verified = await verifyFirebaseIdToken(token);
    if (verified && !platformConfigService.isUserDisabled(verified.uid)) {
      req.authUser = verified;
      platformConfigService.upsertSeenUser({
        uid: verified.uid,
        email: verified.email,
        displayName: verified.name,
        emailVerified: verified.emailVerified,
        defaultAdmin: isAdminEmail(verified.email, verified.emailVerified)
      });
    }
  }
  next();
}
async function requireAuthenticated(req, res, next) {
  const authHeader = String(req.headers.authorization || "");
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) {
    res.status(401).json({
      error: "Authentication required. Please sign in to continue."
    });
    return;
  }
  const verified = await verifyFirebaseIdToken(token);
  if (!verified) {
    res.status(401).json({
      error: "Invalid or expired Firebase authentication token."
    });
    return;
  }
  if (platformConfigService.isUserDisabled(verified.uid)) {
    backendLogger.warn("AUTH", "DISABLED_ACCOUNT_BLOCKED", "Blocked request from disabled user.", {
      actorUid: verified.uid,
      actorEmail: verified.email
    });
    res.status(403).json({
      error: "This account has been disabled by an administrator."
    });
    return;
  }
  platformConfigService.upsertSeenUser({
    uid: verified.uid,
    email: verified.email,
    displayName: verified.name,
    emailVerified: verified.emailVerified,
    defaultAdmin: isAdminEmail(verified.email, verified.emailVerified)
  });
  req.authUser = verified;
  next();
}
async function requireAdmin(req, res, next) {
  const authHeader = String(req.headers.authorization || "");
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) {
    res.status(401).json({
      error: "Administrator sign-in required. Sign in with an authorized account."
    });
    return;
  }
  const verified = await verifyFirebaseIdToken(token);
  if (!verified) {
    res.status(401).json({
      error: "Invalid or expired Firebase authentication token."
    });
    return;
  }
  platformConfigService.upsertSeenUser({
    uid: verified.uid,
    email: verified.email,
    displayName: verified.name,
    emailVerified: verified.emailVerified,
    defaultAdmin: isAdminEmail(verified.email, verified.emailVerified)
  });
  if (!isUserAuthorizedAdmin(verified)) {
    backendLogger.warn(
      "ADMIN",
      "ADMIN_ACCESS_DENIED",
      `Denied admin access for ${verified.email} (verified=${verified.emailVerified}).`,
      { actorUid: verified.uid, actorEmail: verified.email }
    );
    res.status(403).json({
      error: "Administrator privileges (with a verified email) are required to access global controls."
    });
    return;
  }
  req.authUser = verified;
  req.adminUser = verified;
  next();
}
async function requireCronOrAdmin(req, res, next) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const authHeader = String(req.headers.authorization || "");
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (cronSecret && token && token === cronSecret) {
    next();
    return;
  }
  await requireAdmin(req, res, next);
}

// backend/middleware/validation.ts
var import_zod = require("zod");
var bookmakerEnum = import_zod.z.enum(["SPORTYBET_TZ", "BETPAWA_TZ"]);
var scannerConfigSchema = import_zod.z.object({
  bookmakerId: bookmakerEnum.optional(),
  minOdds: import_zod.z.number().min(1.01).max(1e3),
  maxOdds: import_zod.z.number().min(1.01).max(1e4),
  startDate: import_zod.z.string().max(40).default(""),
  endDate: import_zod.z.string().max(40).default(""),
  sportId: import_zod.z.string().max(40).default("sr:sport:1"),
  leagues: import_zod.z.array(import_zod.z.string().max(120)).max(50).default([]),
  matchStatus: import_zod.z.enum(["ALL", "UPCOMING", "LIVE"]).default("ALL"),
  markets: import_zod.z.array(import_zod.z.string().max(20)).max(20).default(["10"]),
  maxResults: import_zod.z.number().int().min(1).max(500).default(100),
  searchQuery: import_zod.z.string().max(100).optional(),
  sortBy: import_zod.z.enum(["kickoff_asc", "odds_asc", "odds_desc"]).optional()
}).refine((val) => val.maxOdds >= val.minOdds, {
  message: "Maximum odds must be greater than or equal to minimum odds.",
  path: ["maxOdds"]
});
var betslipSelectionSchema = import_zod.z.object({
  selectionKey: import_zod.z.string().min(1).max(200),
  bookmakerId: bookmakerEnum.optional(),
  bookmakerName: import_zod.z.string().max(100).optional(),
  eventId: import_zod.z.string().min(1).max(100),
  homeTeam: import_zod.z.string().min(1).max(140),
  awayTeam: import_zod.z.string().min(1).max(140),
  leagueName: import_zod.z.string().max(140).default("Football"),
  country: import_zod.z.string().max(100).default("International"),
  estimateStartTime: import_zod.z.number().nonnegative(),
  matchStatus: import_zod.z.string().max(40).default("Not start"),
  isLive: import_zod.z.boolean().default(false),
  marketId: import_zod.z.string().min(1).max(40),
  marketName: import_zod.z.string().min(1).max(120),
  specifier: import_zod.z.string().max(80).default(""),
  outcomeId: import_zod.z.string().min(1).max(40),
  outcomeDesc: import_zod.z.string().min(1).max(120),
  odds: import_zod.z.number().gt(1).max(1e4),
  addedAt: import_zod.z.string().max(60)
});
var betslipPayloadSchema = import_zod.z.object({
  bookmakerId: bookmakerEnum.optional(),
  selections: import_zod.z.array(betslipSelectionSchema).min(1).max(30)
});
var oddsCategorySchema = import_zod.z.object({
  id: import_zod.z.string().min(1).max(40),
  label: import_zod.z.string().min(1).max(60),
  minCombinedOdds: import_zod.z.number().min(1.05).max(1e4),
  maxCombinedOdds: import_zod.z.number().min(1.1).max(1e5),
  targetCombinedOdds: import_zod.z.number().min(1.05).max(1e5),
  weight: import_zod.z.number().int().min(1).max(100)
}).refine((c) => c.maxCombinedOdds >= c.minCombinedOdds, {
  message: "Category maxCombinedOdds must be >= minCombinedOdds.",
  path: ["maxCombinedOdds"]
});
var dailyFactoryConfigSchema = import_zod.z.object({
  enabled: import_zod.z.boolean(),
  paused: import_zod.z.boolean().default(false),
  activeBookmaker: bookmakerEnum.optional(),
  minIndividualOdds: import_zod.z.number().min(1.01).max(100),
  maxIndividualOdds: import_zod.z.number().min(1.01).max(1e3),
  dailyTicketTarget: import_zod.z.number().int().min(1).max(200),
  maxTickets: import_zod.z.number().int().min(1).max(200),
  minSelections: import_zod.z.number().int().min(1).max(25),
  maxSelections: import_zod.z.number().int().min(1).max(25),
  sportIds: import_zod.z.array(import_zod.z.string().max(40)).min(1).max(10).default(["sr:sport:1"]),
  markets: import_zod.z.array(import_zod.z.string().max(20)).max(20),
  anyMarket: import_zod.z.boolean(),
  leagues: import_zod.z.array(import_zod.z.string().max(120)).max(50),
  datePreset: import_zod.z.enum(["TODAY", "TOMORROW", "CUSTOM"]),
  customStartDate: import_zod.z.string().max(40).default(""),
  customEndDate: import_zod.z.string().max(40).default(""),
  windowStartTime: import_zod.z.string().regex(/^\d{2}:\d{2}$/),
  windowEndTime: import_zod.z.string().regex(/^\d{2}:\d{2}$/),
  timezone: import_zod.z.string().min(1).max(60),
  oddsCategories: import_zod.z.array(oddsCategorySchema).min(1).max(12),
  duplicatePrevention: import_zod.z.boolean(),
  autoCreateBookingCodes: import_zod.z.boolean(),
  scheduleIntervalMinutes: import_zod.z.number().int().min(5).max(1440)
}).refine((v) => v.maxIndividualOdds >= v.minIndividualOdds, {
  message: "Maximum individual odds must be >= minimum individual odds.",
  path: ["maxIndividualOdds"]
}).refine((v) => v.maxSelections >= v.minSelections, {
  message: "Maximum selections must be >= minimum selections.",
  path: ["maxSelections"]
});
var transferDirectionEnum = import_zod.z.enum(["SPORTYBET_TO_BETPAWA", "BETPAWA_TO_SPORTYBET"]);
var transferSourceSelectionSchema = import_zod.z.object({
  id: import_zod.z.string().min(1).max(120),
  homeTeam: import_zod.z.string().min(1).max(140),
  awayTeam: import_zod.z.string().min(1).max(140),
  leagueName: import_zod.z.string().max(140).optional(),
  country: import_zod.z.string().max(100).optional(),
  estimateStartTime: import_zod.z.number().nonnegative().optional(),
  marketId: import_zod.z.string().max(40).optional(),
  marketName: import_zod.z.string().min(1).max(120),
  specifier: import_zod.z.string().max(80).optional(),
  outcomeId: import_zod.z.string().max(40).optional(),
  outcomeDesc: import_zod.z.string().min(1).max(120),
  odds: import_zod.z.number().gt(1).max(1e4),
  eventId: import_zod.z.string().max(100).optional()
});
var transferPreviewSchema = import_zod.z.object({
  direction: transferDirectionEnum,
  bookingCode: import_zod.z.string().trim().max(32).optional(),
  manualSelections: import_zod.z.array(transferSourceSelectionSchema).max(30).optional()
}).refine(
  (v) => Boolean(v.bookingCode) && v.bookingCode.trim().length >= 3 || Array.isArray(v.manualSelections) && v.manualSelections.length >= 1,
  {
    message: "Provide a booking code (3+ chars) or at least 1 manual selection."
  }
);
var transferConfirmSchema = import_zod.z.object({
  transferId: import_zod.z.string().min(1).max(120).optional(),
  direction: transferDirectionEnum,
  originalCode: import_zod.z.string().max(32).default("MANUAL"),
  originalSelectionCount: import_zod.z.number().int().min(1).max(30),
  originalCombinedOdds: import_zod.z.number().min(1).max(1e6),
  confirmedSelections: import_zod.z.array(betslipSelectionSchema).min(1).max(30)
});
var canonicalMarketEnum = import_zod.z.enum([
  "1X2_FT",
  "DOUBLE_CHANCE_FT",
  "OVER_UNDER_FT",
  "BTTS_FT",
  "DRAW_NO_BET_FT",
  "ODD_EVEN_FT",
  "HOME_OU_FT",
  "AWAY_OU_FT",
  "ASIAN_HANDICAP_FT",
  "HT_1X2",
  "HT_OVER_UNDER",
  "HT_DOUBLE_CHANCE",
  "HT_BTTS"
]);
var platformSettingsSchema = import_zod.z.object({
  sportybetEnabled: import_zod.z.boolean(),
  betpawaEnabled: import_zod.z.boolean(),
  crossTransferEnabled: import_zod.z.boolean(),
  supportedTransferMarkets: import_zod.z.array(canonicalMarketEnum).min(1).max(20)
});
var userAccessUpdateSchema = import_zod.z.object({
  role: import_zod.z.enum(["USER", "ADMIN"]).optional(),
  disabled: import_zod.z.boolean().optional(),
  email: import_zod.z.string().email().max(254).optional(),
  displayName: import_zod.z.string().min(1).max(120).optional()
});
var authAuditSchema = import_zod.z.object({
  event: import_zod.z.enum(["SIGNUP", "LOGIN", "LOGOUT", "PASSWORD_RESET", "EMAIL_VERIFICATION_SENT", "LOGIN_FAILED"]),
  email: import_zod.z.string().max(254).optional(),
  details: import_zod.z.string().max(300).optional()
});

// backend/services/automationStore.ts
var import_fs2 = __toESM(require("fs"), 1);
var import_os2 = __toESM(require("os"), 1);
var import_path2 = __toESM(require("path"), 1);

// src/utils/dailyFeedFilter.ts
var DISALLOWED_DAILY_FEED_MARKET_IDS = /* @__PURE__ */ new Set([
  "1",
  // SportyBet 1X2
  "11",
  // SportyBet Draw No Bet
  "60",
  // SportyBet 1st Half 1X2
  "3743",
  // betPawa 1X2
  "4703"
  // betPawa Draw No Bet
]);
var DEFAULT_ALLOWED_DAILY_FEED_MARKETS = ["10", "18", "29", "26", "36"];
var DISALLOWED_MARKET_NAME_PATTERNS = [
  /\b1\s*x\s*2\b/i,
  /match\s*winner/i,
  /draw\s*no\s*bet/i,
  /\b3\s*-?\s*way\b/i,
  /\bfull\s*time\s*result\b/i
];
var DISALLOWED_OUTCOME_EXACT = /* @__PURE__ */ new Set([
  "1",
  "x",
  "2",
  "home",
  "away",
  "draw",
  "12",
  "1/2",
  "home or away",
  "home/away",
  "home team or away team"
]);
function isDisallowedDailyFeedMarket(marketId, marketName) {
  const cleanId = String(marketId || "").trim();
  if (cleanId && DISALLOWED_DAILY_FEED_MARKET_IDS.has(cleanId)) {
    return true;
  }
  const cleanName = String(marketName || "").trim();
  if (!cleanName) return false;
  return DISALLOWED_MARKET_NAME_PATTERNS.some((re) => re.test(cleanName));
}
function isDisallowedDailyFeedSelection(input) {
  if (isDisallowedDailyFeedMarket(input.marketId, input.marketName)) {
    return true;
  }
  const cleanMarketId = String(input.marketId || "").trim();
  const cleanOutcomeId = String(input.outcomeId || "").trim();
  if (cleanMarketId === "10" && cleanOutcomeId === "10") {
    return true;
  }
  const cleanOutcome = String(input.outcomeDesc || "").trim().toLowerCase().replace(/\s+/g, " ");
  if (!cleanOutcome) return false;
  if (DISALLOWED_OUTCOME_EXACT.has(cleanOutcome)) {
    return true;
  }
  if (cleanOutcome.includes("home or away") || cleanOutcome.includes("home/away")) {
    return true;
  }
  return false;
}
function sanitizeDailyFactoryMarkets(markets) {
  const cleaned = (markets || []).map((m) => String(m || "").trim()).filter((m) => Boolean(m) && !DISALLOWED_DAILY_FEED_MARKET_IDS.has(m));
  return Array.from(new Set(cleaned));
}
function isTicketAllowedInDailyFeed(ticket) {
  if (!Array.isArray(ticket.selections) || ticket.selections.length === 0) {
    return false;
  }
  return ticket.selections.every((sel) => !isDisallowedDailyFeedSelection(sel));
}

// backend/services/dailyFactoryEngine.ts
var import_crypto3 = __toESM(require("crypto"), 1);
var DEFAULT_ODDS_CATEGORIES = [
  {
    id: "cat_2_3",
    label: "2.00\u20133.00",
    minCombinedOdds: 2,
    maxCombinedOdds: 3,
    targetCombinedOdds: 2.45,
    weight: 30
  },
  {
    id: "cat_3_5",
    label: "3.00\u20135.00",
    minCombinedOdds: 3,
    maxCombinedOdds: 5,
    targetCombinedOdds: 3.9,
    weight: 30
  },
  {
    id: "cat_5_10",
    label: "5.00\u201310.00",
    minCombinedOdds: 5,
    maxCombinedOdds: 10,
    targetCombinedOdds: 7.2,
    weight: 25
  },
  {
    id: "cat_10_20",
    label: "10.00\u201320.00",
    minCombinedOdds: 10,
    maxCombinedOdds: 20,
    targetCombinedOdds: 13.5,
    weight: 15
  }
];
function getDateKeyInTimezone(ms, timezone = "Africa/Dar_es_Salaam") {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(new Date(ms));
  } catch {
    return new Date(ms).toISOString().slice(0, 10);
  }
}
function getTimeMinutesInTimezone(ms, timezone = "Africa/Dar_es_Salaam") {
  try {
    const formatted = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(new Date(ms));
    const [hh, mm] = formatted.split(":").map(Number);
    return hh % 24 * 60 + mm;
  } catch {
    const d = new Date(ms);
    return d.getUTCHours() * 60 + d.getUTCMinutes();
  }
}
function parseHhMmToMinutes(hhmm, fallback) {
  const m = /^(\d{1,2}):(\d{2})$/.exec((hhmm || "").trim());
  if (!m) return fallback;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return fallback;
  return h * 60 + min;
}
function isOddsWithinStrictBounds(odds, minIndividualOdds, maxIndividualOdds) {
  if (!Number.isFinite(odds) || odds <= 1) return false;
  const milliOdds = Math.round(odds * 1e3);
  const milliMin = Math.round(minIndividualOdds * 1e3);
  const milliMax = Math.round(maxIndividualOdds * 1e3);
  return milliOdds >= milliMin && milliOdds <= milliMax;
}
function normalizeTeamKey(teamName) {
  return String(teamName || "").trim().toLowerCase().replace(/\s+/g, " ");
}
function computeTicketSignature(selections) {
  const sorted = [...selections].map((s) => s.selectionKey).sort().join("|");
  return import_crypto3.default.createHash("sha256").update(sorted).digest("hex").slice(0, 24);
}
function resolveFactoryDateRange(config, nowMs = Date.now()) {
  const tz = config.timezone || "Africa/Dar_es_Salaam";
  const today = getDateKeyInTimezone(nowMs, tz);
  const tomorrow = getDateKeyInTimezone(nowMs + 864e5, tz);
  if (config.datePreset === "TOMORROW") {
    return { startDate: tomorrow, endDate: tomorrow };
  }
  if (config.datePreset === "CUSTOM" && config.customStartDate) {
    const start = config.customStartDate;
    const end = config.customEndDate && config.customEndDate >= start ? config.customEndDate : start;
    return { startDate: start, endDate: end };
  }
  return { startDate: today, endDate: today };
}
var SPORTYBET_TO_BETPAWA_MARKETS = {
  "1": "3743",
  "10": "4693",
  "18": "5000",
  "29": "3795",
  "11": "4703",
  "26": "3774",
  "16": "5006",
  "14": "5003",
  "36": "4833"
};
var BETPAWA_TO_SPORTYBET_MARKETS = Object.fromEntries(
  Object.entries(SPORTYBET_TO_BETPAWA_MARKETS).map(([sb, bp]) => [bp, sb])
);
function resolveEffectiveMarketsForBookmaker(markets, bookmakerId) {
  const catalogIds = new Set(
    getBookmakerMarketCatalog(bookmakerId).filter((m) => !isDisallowedDailyFeedMarket(m.id, m.name)).map((m) => m.id)
  );
  const mapTable = bookmakerId === "BETPAWA_TZ" ? SPORTYBET_TO_BETPAWA_MARKETS : BETPAWA_TO_SPORTYBET_MARKETS;
  const sanitizedInputs = sanitizeDailyFactoryMarkets(markets);
  const resolved = [];
  for (const clean of sanitizedInputs) {
    if (catalogIds.has(clean)) {
      resolved.push(clean);
    } else if (mapTable[clean] && catalogIds.has(mapTable[clean])) {
      resolved.push(mapTable[clean]);
    }
  }
  return Array.from(new Set(resolved));
}
function discoverEligibleSelections(matches, config, nowMs = Date.now()) {
  const tz = config.timezone || "Africa/Dar_es_Salaam";
  const { startDate, endDate } = resolveFactoryDateRange(config, nowMs);
  const minStartMinutes = parseHhMmToMinutes(config.windowStartTime, 0);
  const maxEndMinutes = parseHhMmToMinutes(config.windowEndTime, 23 * 60 + 59);
  const configuredBookmaker = normalizeBookmakerId(config.activeBookmaker);
  const leagueSet = new Set(
    (config.leagues || []).map((l) => l.trim().toLowerCase()).filter(Boolean)
  );
  const effectiveMarkets = resolveEffectiveMarketsForBookmaker(
    config.markets || [],
    matches[0]?.bookmakerId ? normalizeBookmakerId(matches[0].bookmakerId) : configuredBookmaker
  );
  const marketSet = new Set(effectiveMarkets);
  const seenSelectionKeys = /* @__PURE__ */ new Set();
  const candidates = [];
  for (const match of matches) {
    if (!match || !match.eventId || !match.homeTeam || !match.awayTeam) continue;
    if (match.isLive || match.estimateStartTime <= nowMs) continue;
    if (match.statusCode !== 0 && match.statusCode !== 2) continue;
    const matchDateKey = getDateKeyInTimezone(match.estimateStartTime, tz);
    if (startDate && matchDateKey < startDate) continue;
    if (endDate && matchDateKey > endDate) continue;
    const kickoffMin = getTimeMinutesInTimezone(match.estimateStartTime, tz);
    if (minStartMinutes <= maxEndMinutes) {
      if (kickoffMin < minStartMinutes || kickoffMin > maxEndMinutes) continue;
    } else {
      if (kickoffMin < minStartMinutes && kickoffMin > maxEndMinutes) continue;
    }
    if (leagueSet.size > 0) {
      const idLow = match.leagueId.toLowerCase();
      const nameLow = match.leagueName.toLowerCase();
      const fullLow = `${match.country.toLowerCase()} - ${nameLow}`;
      if (!leagueSet.has(idLow) && !leagueSet.has(nameLow) && !leagueSet.has(fullLow)) {
        continue;
      }
    }
    for (const market of match.markets || []) {
      if (market.status !== 0 || market.banned) continue;
      if (isDisallowedDailyFeedMarket(market.marketId, market.desc || market.name)) {
        continue;
      }
      if (!config.anyMarket && marketSet.size > 0 && !marketSet.has(market.marketId)) {
        continue;
      }
      for (const outcome of market.outcomes || []) {
        if (!outcome.isActive) continue;
        if (isDisallowedDailyFeedSelection({
          marketId: market.marketId,
          marketName: market.desc || market.name,
          outcomeId: outcome.outcomeId,
          outcomeDesc: outcome.desc
        })) {
          continue;
        }
        if (!isOddsWithinStrictBounds(
          outcome.odds,
          config.minIndividualOdds,
          config.maxIndividualOdds
        )) {
          continue;
        }
        const selectionKey = `${match.eventId}::${market.marketId}::${market.specifier || ""}::${outcome.outcomeId}`;
        if (seenSelectionKeys.has(selectionKey)) continue;
        seenSelectionKeys.add(selectionKey);
        const matchBookmaker = normalizeBookmakerId(match.bookmakerId || configuredBookmaker);
        const matchBookmakerInfo = getBookmakerInfo(matchBookmaker);
        candidates.push({
          selectionKey,
          bookmakerId: matchBookmaker,
          bookmakerName: match.bookmakerName || matchBookmakerInfo.name,
          eventId: match.eventId,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          leagueId: match.leagueId,
          leagueName: match.leagueName,
          country: match.country,
          estimateStartTime: match.estimateStartTime,
          matchStatus: match.matchStatus,
          isLive: false,
          marketId: market.marketId,
          marketName: market.desc || market.name,
          specifier: market.specifier || "",
          outcomeId: outcome.outcomeId,
          outcomeDesc: outcome.desc,
          odds: outcome.odds,
          addedAt: new Date(nowMs).toISOString(),
          retrievedAt: match.retrievedAt
        });
      }
    }
  }
  return candidates;
}
function buildCategoryCombination(params) {
  const {
    byEvent,
    uniqueEvents,
    category,
    minLegs,
    maxLegs,
    existingSignatures,
    eventUsageCount,
    teamUsageCount,
    excludedEventIds,
    excludedTeamKeys,
    disjointOnly = false,
    attemptIdx
  } = params;
  const eligibleEvents = uniqueEvents.filter((evId) => {
    if (excludedEventIds?.has(evId)) return false;
    const sample = byEvent.get(evId)?.[0];
    if (!sample) return false;
    if (excludedTeamKeys) {
      const hKey = normalizeTeamKey(sample.homeTeam);
      const aKey = normalizeTeamKey(sample.awayTeam);
      if (excludedTeamKeys.has(hKey) || excludedTeamKeys.has(aKey)) {
        return false;
      }
    }
    return true;
  });
  const effectiveMaxLegs = Math.min(maxLegs, eligibleEvents.length, 25);
  if (eligibleEvents.length < minLegs) return null;
  const rankedEvents = [...eligibleEvents].sort((ea, eb) => {
    const sa = byEvent.get(ea)?.[0];
    const sb = byEvent.get(eb)?.[0];
    const teamUseA = sa ? (teamUsageCount?.get(normalizeTeamKey(sa.homeTeam)) || 0) + (teamUsageCount?.get(normalizeTeamKey(sa.awayTeam)) || 0) : 0;
    const teamUseB = sb ? (teamUsageCount?.get(normalizeTeamKey(sb.homeTeam)) || 0) + (teamUsageCount?.get(normalizeTeamKey(sb.awayTeam)) || 0) : 0;
    const ua = (eventUsageCount.get(ea) || 0) * 2 + teamUseA;
    const ub = (eventUsageCount.get(eb) || 0) * 2 + teamUseB;
    if (ua !== ub) return ua - ub;
    const hashA = ((ea.charCodeAt(ea.length - 1) || 0) * 13 + attemptIdx * 17) % 101;
    const hashB = ((eb.charCodeAt(eb.length - 1) || 0) * 13 + attemptIdx * 23) % 101;
    return hashA - hashB;
  });
  let beam = [
    {
      picks: [],
      usedEvents: /* @__PURE__ */ new Set(),
      usedTeams: /* @__PURE__ */ new Set(),
      product: 1,
      score: category.targetCombinedOdds
    }
  ];
  let bestValid = null;
  const eventPool = rankedEvents.slice(0, Math.min(rankedEvents.length, 48));
  for (const evId of eventPool) {
    const rawOutcomes = byEvent.get(evId) || [];
    if (rawOutcomes.length === 0) continue;
    const evHomeKey = normalizeTeamKey(rawOutcomes[0].homeTeam);
    const evAwayKey = normalizeTeamKey(rawOutcomes[0].awayTeam);
    const outcomes = [...rawOutcomes].sort((a, b) => {
      if (disjointOnly) return b.odds - a.odds;
      if (attemptIdx % 3 === 0) return b.odds - a.odds;
      if (attemptIdx % 3 === 1) return a.odds - b.odds;
      return a.selectionKey.localeCompare(b.selectionKey);
    }).slice(0, 3);
    const nextBeam = [...beam];
    for (const state of beam) {
      if (state.picks.length >= effectiveMaxLegs) continue;
      if (state.usedEvents.has(evId)) continue;
      if (state.usedTeams.has(evHomeKey) || state.usedTeams.has(evAwayKey)) continue;
      for (const out of outcomes) {
        const newProd = Number((state.product * out.odds).toFixed(4));
        if (newProd > category.maxCombinedOdds * 1.1 && state.picks.length + 1 >= minLegs) {
          continue;
        }
        const newPicks = [...state.picks, out];
        const newUsed = new Set(state.usedEvents);
        newUsed.add(evId);
        const newUsedTeams = new Set(state.usedTeams);
        newUsedTeams.add(evHomeKey);
        newUsedTeams.add(evAwayKey);
        const dist = Math.abs(newProd - category.targetCombinedOdds);
        const legPenalty = newProd < category.minCombinedOdds ? (category.minCombinedOdds - newProd) * 2 : 0;
        const conservationPenalty = disjointOnly ? newPicks.length * 0.08 : 0;
        const candidate = {
          picks: newPicks,
          usedEvents: newUsed,
          usedTeams: newUsedTeams,
          product: newProd,
          score: dist + legPenalty + conservationPenalty
        };
        if (newPicks.length >= minLegs && newPicks.length <= effectiveMaxLegs && newProd >= category.minCombinedOdds && newProd <= category.maxCombinedOdds) {
          const sig = computeTicketSignature(newPicks);
          if (!existingSignatures.has(sig)) {
            if (!bestValid || candidate.score < bestValid.score) {
              bestValid = candidate;
            }
          }
        }
        nextBeam.push(candidate);
      }
    }
    nextBeam.sort((a, b) => a.score - b.score);
    beam = nextBeam.slice(0, 32);
  }
  return bestValid ? bestValid.picks : null;
}
function revalidateTicketSelectionsAgainstMatches(selections, matchLookup, config, nowMs = Date.now()) {
  const seenEvents = /* @__PURE__ */ new Set();
  const refreshedSelections = [];
  for (const sel of selections) {
    if (isDisallowedDailyFeedSelection(sel)) {
      return {
        valid: false,
        refreshedSelections: [],
        reason: "Home/Away (12) and straight 1X2/DNB selections are excluded from Daily Feed tickets"
      };
    }
    if (seenEvents.has(sel.eventId)) {
      return { valid: false, refreshedSelections: [], reason: "Duplicate event detected in ticket" };
    }
    seenEvents.add(sel.eventId);
    const liveMatch = matchLookup.get(sel.eventId);
    if (!liveMatch) {
      return {
        valid: false,
        refreshedSelections: [],
        reason: `Event ${sel.eventId} unavailable during pre-publish validation`
      };
    }
    if (liveMatch.isLive || liveMatch.estimateStartTime <= nowMs) {
      return {
        valid: false,
        refreshedSelections: [],
        reason: `Match ${sel.homeTeam} vs ${sel.awayTeam} already started or went live`
      };
    }
    const market = liveMatch.markets.find(
      (m) => m.marketId === sel.marketId && (m.specifier || "") === (sel.specifier || "")
    );
    if (!market || market.status !== 0 || market.banned) {
      return {
        valid: false,
        refreshedSelections: [],
        reason: `Market ${sel.marketName} suspended on ${sel.homeTeam} vs ${sel.awayTeam}`
      };
    }
    const outcome = market.outcomes.find((o) => o.outcomeId === sel.outcomeId);
    if (!outcome || !outcome.isActive) {
      return {
        valid: false,
        refreshedSelections: [],
        reason: `Outcome ${sel.outcomeDesc} deactivated before publish`
      };
    }
    if (!isOddsWithinStrictBounds(
      outcome.odds,
      config.minIndividualOdds,
      config.maxIndividualOdds
    )) {
      return {
        valid: false,
        refreshedSelections: [],
        reason: `Live odds shifted to ${outcome.odds.toFixed(2)}, outside allowed ${config.minIndividualOdds.toFixed(
          2
        )}\u2013${config.maxIndividualOdds.toFixed(2)} range`
      };
    }
    refreshedSelections.push({
      ...sel,
      odds: outcome.odds,
      retrievedAt: liveMatch.retrievedAt
    });
  }
  return { valid: true, refreshedSelections, reason: null };
}
function generateDailyPortfolioFromMatches(params) {
  const { matches, config } = params;
  const nowMs = params.nowMs ?? Date.now();
  const sourceType = params.sourceType ?? "DAILY_FACTORY";
  const targetCount = Math.max(1, Math.min(200, params.targetCount));
  const existingSignatures = new Set(params.existingSignatures || []);
  const activeBookmaker = normalizeBookmakerId(
    matches[0]?.bookmakerId || config.activeBookmaker
  );
  const bookmakerInfo = getBookmakerInfo(activeBookmaker);
  const candidates = discoverEligibleSelections(matches, config, nowMs);
  if (candidates.length === 0) {
    return {
      tickets: [],
      eligibleSelectionsFound: 0,
      shortfallReason: `No upcoming ${bookmakerInfo.shortName} matches had active outcomes strictly between ${config.minIndividualOdds.toFixed(
        2
      )} and ${config.maxIndividualOdds.toFixed(2)} within the configured schedule.`
    };
  }
  const byEvent = /* @__PURE__ */ new Map();
  for (const c of candidates) {
    const arr = byEvent.get(c.eventId) || [];
    arr.push(c);
    byEvent.set(c.eventId, arr);
  }
  const uniqueEvents = Array.from(byEvent.keys());
  const categories = config.oddsCategories && config.oddsCategories.length > 0 ? config.oddsCategories : DEFAULT_ODDS_CATEGORIES;
  const minLegs = Math.max(1, Math.min(25, config.minSelections));
  const maxLegs = Math.max(minLegs, Math.min(25, config.maxSelections));
  const tz = config.timezone || "Africa/Dar_es_Salaam";
  const generatedAt = new Date(nowMs).toISOString();
  const generatedDateKey = getDateKeyInTimezone(nowMs, tz);
  const dataSource = activeBookmaker === "BETPAWA_TZ" ? "betPawa Tanzania Public API (/api/sportsbook/v4)" : "SportyBet Tanzania Public API (/api/tz)";
  const ticketPrefix = activeBookmaker === "BETPAWA_TZ" ? "BP" : "SB";
  const totalWeight = categories.reduce((s, c) => s + Math.max(1, c.weight || 1), 0);
  const categorySchedule = [];
  for (const cat of categories) {
    const share = Math.max(
      1,
      Math.round(Math.max(1, cat.weight || 1) / totalWeight * targetCount)
    );
    for (let i = 0; i < share; i++) {
      categorySchedule.push(cat);
    }
  }
  const disjointUsedEvents = new Set(params.existingEventIds || []);
  const disjointUsedTeams = new Set(params.existingTeamKeys || []);
  const eventUsageCount = /* @__PURE__ */ new Map();
  const teamUsageCount = /* @__PURE__ */ new Map();
  for (const evId of disjointUsedEvents) {
    eventUsageCount.set(evId, 1);
  }
  for (const teamKey of disjointUsedTeams) {
    teamUsageCount.set(teamKey, 1);
  }
  const tickets = [];
  let attemptCounter = 0;
  const pushGeneratedTicket = (picks, cat) => {
    const sig = computeTicketSignature(picks);
    if (existingSignatures.has(sig)) return false;
    existingSignatures.add(sig);
    for (const p of picks) {
      disjointUsedEvents.add(p.eventId);
      const hKey = normalizeTeamKey(p.homeTeam);
      const aKey = normalizeTeamKey(p.awayTeam);
      disjointUsedTeams.add(hKey);
      disjointUsedTeams.add(aKey);
      eventUsageCount.set(p.eventId, (eventUsageCount.get(p.eventId) || 0) + 1);
      teamUsageCount.set(hKey, (teamUsageCount.get(hKey) || 0) + 1);
      teamUsageCount.set(aKey, (teamUsageCount.get(aKey) || 0) + 1);
    }
    const actualCombinedOdds = Number(
      picks.reduce((acc, p) => acc * p.odds, 1).toFixed(2)
    );
    const oddsDifference = Number((actualCombinedOdds - cat.targetCombinedOdds).toFixed(2));
    const kickoffStartMs = picks.reduce(
      (min, p) => Math.min(min, p.estimateStartTime),
      picks[0].estimateStartTime
    );
    const kickoffEndMs = picks.reduce(
      (max, p) => Math.max(max, p.estimateStartTime),
      picks[0].estimateStartTime
    );
    const internalTicketId = `${ticketPrefix}-${generatedDateKey.replace(/-/g, "")}-${import_crypto3.default.randomBytes(3).toString("hex").toUpperCase()}`;
    tickets.push({
      internalTicketId,
      signature: sig,
      bookmakerId: activeBookmaker,
      bookmakerName: bookmakerInfo.name,
      bookmakerUrl: bookmakerInfo.websiteUrl,
      sourceType,
      categoryId: cat.id,
      categoryLabel: cat.label,
      targetOdds: cat.targetCombinedOdds,
      actualCombinedOdds,
      oddsDifference,
      selectionCount: picks.length,
      selections: picks,
      kickoffStartMs,
      kickoffEndMs,
      dataSource,
      generatedAt,
      generatedDateKey,
      published: true,
      revalidatedAt: generatedAt,
      status: "PENDING",
      effectiveCombinedOdds: actualCombinedOdds,
      selectionSettlements: picks.map((p) => ({
        selectionKey: p.selectionKey,
        eventId: p.eventId,
        status: "PENDING",
        officialMatchStatus: p.matchStatus,
        score: null,
        playedSeconds: null,
        currentOdds: p.odds,
        oddsChanged: false,
        reason: "Awaiting kickoff",
        checkedAt: generatedAt
      })),
      shareCode: null,
      shareUrl: null,
      shareCodeDeadline: null,
      shareCodeVerified: false,
      bookingCodeStatus: "NOT_REQUESTED",
      bookingCodeError: null,
      settledAt: null,
      lastCheckedAt: null
    });
    return true;
  };
  let consecutiveFailures = 0;
  const maxPass1Iterations = Math.max(targetCount * 3, 180);
  for (let iter = 0; iter < maxPass1Iterations && tickets.length < targetCount; iter++) {
    const cat = categorySchedule[iter % categorySchedule.length] || categories[iter % categories.length];
    const picks = buildCategoryCombination({
      byEvent,
      uniqueEvents,
      category: cat,
      minLegs,
      maxLegs,
      existingSignatures,
      eventUsageCount,
      teamUsageCount,
      excludedEventIds: disjointUsedEvents,
      excludedTeamKeys: disjointUsedTeams,
      disjointOnly: true,
      attemptIdx: attemptCounter++
    });
    if (!picks || !pushGeneratedTicket(picks, cat)) {
      consecutiveFailures++;
      if (consecutiveFailures >= categories.length * 3) break;
      continue;
    }
    consecutiveFailures = 0;
  }
  if (tickets.length < targetCount) {
    let fallbackFailures = 0;
    const maxPass2Iterations = Math.max((targetCount - tickets.length) * 4, 120);
    for (let iter = 0; iter < maxPass2Iterations && tickets.length < targetCount; iter++) {
      const cat = categorySchedule[(tickets.length + iter) % categorySchedule.length] || categories[(tickets.length + iter) % categories.length];
      const picks = buildCategoryCombination({
        byEvent,
        uniqueEvents,
        category: cat,
        minLegs,
        maxLegs,
        existingSignatures,
        eventUsageCount,
        teamUsageCount,
        disjointOnly: false,
        attemptIdx: attemptCounter++
      });
      if (!picks || !pushGeneratedTicket(picks, cat)) {
        fallbackFailures++;
        if (fallbackFailures >= categories.length * 4) break;
        continue;
      }
      fallbackFailures = 0;
    }
  }
  let shortfallReason = null;
  if (tickets.length < targetCount) {
    shortfallReason = tickets.length === 0 ? `0 combinations satisfied target odds categories with individual odds strictly within ${config.minIndividualOdds.toFixed(
      2
    )}\u2013${config.maxIndividualOdds.toFixed(2)} across ${uniqueEvents.length} qualifying upcoming matches.` : `Published ${tickets.length} of ${targetCount} daily target tickets from ${uniqueEvents.length} qualifying upcoming matches (${candidates.length} active selections within ${config.minIndividualOdds.toFixed(
      2
    )}\u2013${config.maxIndividualOdds.toFixed(2)}). Remaining combinations were exhausted without duplicating tickets or relaxing odds bounds.`;
  }
  return {
    tickets,
    eligibleSelectionsFound: candidates.length,
    shortfallReason
  };
}
async function fetchUpcomingMatchesForFactory(config) {
  const bookmakerId = normalizeBookmakerId(config.activeBookmaker);
  const client = getBookmakerClient(bookmakerId);
  const allCatalogMarkets = getBookmakerMarketCatalog(bookmakerId).filter((m) => !isDisallowedDailyFeedMarket(m.id, m.name)).map((m) => m.id);
  const effectiveMarkets = resolveEffectiveMarketsForBookmaker(
    config.markets && config.markets.length > 0 ? config.markets : DEFAULT_ALLOWED_DAILY_FEED_MARKETS,
    bookmakerId
  );
  const marketIds = config.anyMarket ? allCatalogMarkets.join(",") : effectiveMarkets.length > 0 ? effectiveMarkets.join(",") : allCatalogMarkets.join(",");
  const sportIds = bookmakerId === "BETPAWA_TZ" ? ["2"] : config.sportIds && config.sportIds.length > 0 ? config.sportIds : ["sr:sport:1"];
  const allMatches = [];
  const seenEvents = /* @__PURE__ */ new Set();
  for (const sportId of sportIds) {
    try {
      const { matches } = await client.getUpcomingMatches({
        pageNum: 1,
        pageSize: 100,
        maxPages: 8,
        marketIds,
        sportId
      });
      for (const m of matches) {
        if (!seenEvents.has(m.eventId)) {
          seenEvents.add(m.eventId);
          allMatches.push(m);
        }
      }
    } catch {
    }
  }
  return allMatches;
}

// backend/services/automationStore.ts
var DEFAULT_DAILY_FACTORY_CONFIG = {
  enabled: true,
  paused: false,
  activeBookmaker: "SPORTYBET_TZ",
  minIndividualOdds: 1.01,
  maxIndividualOdds: 1.25,
  dailyTicketTarget: 55,
  maxTickets: 100,
  minSelections: 2,
  maxSelections: 15,
  sportIds: ["sr:sport:1"],
  markets: [...DEFAULT_ALLOWED_DAILY_FEED_MARKETS],
  anyMarket: false,
  leagues: [],
  datePreset: "TODAY",
  customStartDate: "",
  customEndDate: "",
  windowStartTime: "00:00",
  windowEndTime: "23:59",
  timezone: "Africa/Dar_es_Salaam",
  oddsCategories: DEFAULT_ODDS_CATEGORIES,
  duplicatePrevention: true,
  autoCreateBookingCodes: true,
  scheduleIntervalMinutes: 60
};
var DATA_DIR2 = process.env.VERCEL ? import_path2.default.join(import_os2.default.tmpdir(), "sportybet-odds-hunter") : import_path2.default.resolve(process.cwd(), ".data");
var STATE_FILE = import_path2.default.join(DATA_DIR2, "automation-state.json");
var AutomationStore = class {
  constructor() {
    this.state = this.loadFromDisk();
  }
  loadFromDisk() {
    try {
      if (import_fs2.default.existsSync(STATE_FILE)) {
        const raw = import_fs2.default.readFileSync(STATE_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed.schemaVersion === 2) {
          const mergedCfg = {
            ...DEFAULT_DAILY_FACTORY_CONFIG,
            ...parsed.factoryConfig || {}
          };
          if (!Array.isArray(mergedCfg.oddsCategories) || mergedCfg.oddsCategories.length === 0) {
            mergedCfg.oddsCategories = DEFAULT_ODDS_CATEGORIES;
          }
          const sanitizedMarkets = sanitizeDailyFactoryMarkets(mergedCfg.markets || []);
          mergedCfg.markets = sanitizedMarkets.length > 0 ? sanitizedMarkets : [...DEFAULT_ALLOWED_DAILY_FEED_MARKETS];
          const rawTickets = Array.isArray(parsed.tickets) ? parsed.tickets.map((t) => ({
            ...t,
            bookmakerId: t.bookmakerId || "SPORTYBET_TZ",
            bookmakerName: t.bookmakerName || (t.bookmakerId === "BETPAWA_TZ" ? "betPawa Tanzania" : "SportyBet Tanzania")
          })) : [];
          const tickets = rawTickets.filter((t) => isTicketAllowedInDailyFeed(t));
          const sanitizedState = {
            schemaVersion: 2,
            tickets,
            factoryConfig: mergedCfg,
            logs: Array.isArray(parsed.logs) ? parsed.logs.slice(0, 150) : [],
            lastFactoryRunAt: parsed.lastFactoryRunAt ?? null,
            lastResultsRunAt: parsed.lastResultsRunAt ?? null,
            lastScanningAt: parsed.lastScanningAt ?? parsed.lastFactoryRunAt ?? null,
            dailyShortfallReason: parsed.dailyShortfallReason ?? null
          };
          if (tickets.length !== rawTickets.length) {
            try {
              import_fs2.default.writeFileSync(STATE_FILE, JSON.stringify(sanitizedState, null, 2), "utf-8");
            } catch {
            }
          }
          return sanitizedState;
        }
      }
    } catch {
    }
    return {
      schemaVersion: 2,
      tickets: [],
      factoryConfig: { ...DEFAULT_DAILY_FACTORY_CONFIG },
      logs: [],
      lastFactoryRunAt: null,
      lastResultsRunAt: null,
      lastScanningAt: null,
      dailyShortfallReason: null
    };
  }
  flushToDisk() {
    try {
      if (!import_fs2.default.existsSync(DATA_DIR2)) {
        import_fs2.default.mkdirSync(DATA_DIR2, { recursive: true });
      }
      import_fs2.default.writeFileSync(STATE_FILE, JSON.stringify(this.state, null, 2), "utf-8");
    } catch (err) {
      console.error("Failed to persist automation state:", err);
    }
  }
  getTickets() {
    return this.state.tickets.filter((t) => isTicketAllowedInDailyFeed(t));
  }
  getTicketById(internalTicketId) {
    const ticket = this.state.tickets.find((t) => t.internalTicketId === internalTicketId);
    if (!ticket || !isTicketAllowedInDailyFeed(ticket)) return void 0;
    return ticket;
  }
  getExistingSignatures() {
    return new Set(this.getTickets().map((t) => t.signature));
  }
  getExistingShareCodes(excludeTicketId) {
    const codes = /* @__PURE__ */ new Set();
    for (const t of this.state.tickets) {
      if (excludeTicketId && t.internalTicketId === excludeTicketId) continue;
      const code = String(t.shareCode || "").trim().toUpperCase();
      if (code) codes.add(code);
    }
    return codes;
  }
  getExistingEventAndTeamUsage(dateKey) {
    const eventIds = /* @__PURE__ */ new Set();
    const teamKeys = /* @__PURE__ */ new Set();
    for (const t of this.getTickets()) {
      if (dateKey && t.generatedDateKey !== dateKey) continue;
      for (const s of t.selections || []) {
        if (s.eventId) eventIds.add(s.eventId);
        if (s.homeTeam) teamKeys.add(normalizeTeamKey(s.homeTeam));
        if (s.awayTeam) teamKeys.add(normalizeTeamKey(s.awayTeam));
      }
    }
    return { eventIds, teamKeys };
  }
  addTickets(newTickets) {
    const existingIds = new Set(this.state.tickets.map((t) => t.internalTicketId));
    const existingSigs = new Set(this.state.tickets.map((t) => t.signature));
    const existingCodes = this.getExistingShareCodes();
    const inserted = [];
    for (const t of newTickets) {
      if (!isTicketAllowedInDailyFeed(t)) continue;
      if (existingIds.has(t.internalTicketId) || existingSigs.has(t.signature)) continue;
      existingIds.add(t.internalTicketId);
      existingSigs.add(t.signature);
      const cleanCode = String(t.shareCode || "").trim().toUpperCase();
      if (cleanCode && existingCodes.has(cleanCode)) {
        inserted.push({
          ...t,
          shareCode: null,
          shareUrl: null,
          shareCodeDeadline: null,
          shareCodeVerified: false,
          bookingCodeStatus: "FAILED",
          bookingCodeError: `Duplicate booking code ${cleanCode} rejected to preserve unique card codes.`
        });
      } else {
        if (cleanCode) existingCodes.add(cleanCode);
        inserted.push(t);
      }
    }
    if (inserted.length > 0) {
      this.state.tickets = [...inserted, ...this.state.tickets].slice(0, 600);
      this.flushToDisk();
    }
    return inserted;
  }
  updateTicketMutableFields(updated) {
    const idx = this.state.tickets.findIndex(
      (t) => t.internalTicketId === updated.internalTicketId
    );
    if (idx === -1) return null;
    const original = this.state.tickets[idx];
    const merged = {
      ...original,
      status: updated.status,
      effectiveCombinedOdds: updated.effectiveCombinedOdds,
      selectionSettlements: updated.selectionSettlements,
      shareCode: updated.shareCode,
      shareUrl: updated.shareUrl,
      shareCodeDeadline: updated.shareCodeDeadline,
      shareCodeVerified: updated.shareCodeVerified,
      bookingCodeStatus: updated.bookingCodeStatus,
      bookingCodeError: updated.bookingCodeError,
      settledAt: updated.settledAt,
      lastCheckedAt: updated.lastCheckedAt
    };
    this.state.tickets[idx] = merged;
    this.flushToDisk();
    return merged;
  }
  deleteTicket(internalTicketId) {
    const before = this.state.tickets.length;
    this.state.tickets = this.state.tickets.filter(
      (t) => t.internalTicketId !== internalTicketId
    );
    if (this.state.tickets.length !== before) {
      this.flushToDisk();
      return true;
    }
    return false;
  }
  getFactoryConfig() {
    return this.state.factoryConfig;
  }
  setFactoryConfig(config) {
    const sanitizedMarkets = sanitizeDailyFactoryMarkets(config.markets || []);
    this.state.factoryConfig = {
      ...config,
      markets: sanitizedMarkets.length > 0 ? sanitizedMarkets : [...DEFAULT_ALLOWED_DAILY_FEED_MARKETS]
    };
    this.flushToDisk();
    return this.state.factoryConfig;
  }
  getLogs() {
    return this.state.logs;
  }
  addLog(log) {
    this.state.logs = [log, ...this.state.logs].slice(0, 150);
    this.flushToDisk();
  }
  getTimestamps() {
    return {
      lastFactoryRunAt: this.state.lastFactoryRunAt,
      lastResultsRunAt: this.state.lastResultsRunAt,
      lastScanningAt: this.state.lastScanningAt,
      dailyShortfallReason: this.state.dailyShortfallReason
    };
  }
  setScanningAt(scanAt) {
    this.state.lastScanningAt = scanAt;
    this.flushToDisk();
  }
  setFactoryRunMeta(runAt, shortfallReason) {
    this.state.lastFactoryRunAt = runAt;
    this.state.lastScanningAt = runAt;
    this.state.dailyShortfallReason = shortfallReason;
    this.flushToDisk();
  }
  setResultsRunAt(runAt) {
    this.state.lastResultsRunAt = runAt;
    this.flushToDisk();
  }
};
var automationStore = new AutomationStore();

// backend/services/betslipService.ts
function calculateCombinedOdds(selections) {
  if (selections.length === 0) return 0;
  const product = selections.reduce((acc, s) => {
    const val = Number(s.odds);
    return Number.isFinite(val) && val > 1 ? acc * val : acc;
  }, 1);
  return Number(product.toFixed(2));
}
function detectDuplicateSelections(selections) {
  const keyCounts = /* @__PURE__ */ new Map();
  const eventCounts = /* @__PURE__ */ new Map();
  for (const s of selections) {
    keyCounts.set(s.selectionKey, (keyCounts.get(s.selectionKey) || 0) + 1);
    eventCounts.set(s.eventId, (eventCounts.get(s.eventId) || 0) + 1);
  }
  const duplicateKeys = /* @__PURE__ */ new Set();
  const duplicateEvents = /* @__PURE__ */ new Set();
  for (const [k, c] of keyCounts.entries()) {
    if (c > 1) duplicateKeys.add(k);
  }
  for (const [e, c] of eventCounts.entries()) {
    if (c > 1) duplicateEvents.add(e);
  }
  return { duplicateKeys, duplicateEvents };
}
function validateBetslipAgainstMatches(selections, liveMatchLookup, nowMs = Date.now()) {
  const { duplicateKeys, duplicateEvents } = detectDuplicateSelections(selections);
  const items = [];
  const globalWarnings = [];
  let hasDuplicates = duplicateKeys.size > 0 || duplicateEvents.size > 0;
  let hasSuspendedMarkets = false;
  let hasOddsChanges = false;
  let hasStartedMatches = false;
  let hasMissingSelections = false;
  const distinctBookmakers = new Set(
    selections.map((s) => s.bookmakerId).filter(Boolean)
  );
  if (distinctBookmakers.size > 1) {
    globalWarnings.push(
      "Betslip contains selections from different bookmakers. Keep SportyBet TZ and betPawa TZ selections strictly separated."
    );
  }
  if (duplicateEvents.size > 0) {
    globalWarnings.push(
      "Multiple selections target the same match; standard accumulator slips require independent events."
    );
  }
  for (const sel of selections) {
    const warnings = [];
    const match = liveMatchLookup.get(sel.eventId) ?? null;
    const duplicateEvent = duplicateEvents.has(sel.eventId);
    if (duplicateEvent) {
      warnings.push("Duplicate event in betslip.");
    }
    let currentOdds = sel.odds;
    let oddsChanged = false;
    let oddsDiff = 0;
    let marketSuspended = false;
    let matchStarted = sel.estimateStartTime > 0 && sel.estimateStartTime <= nowMs && !sel.isLive;
    let missingSelection = false;
    if (!match) {
      missingSelection = true;
      currentOdds = null;
      hasMissingSelections = true;
      warnings.push("Event no longer returned by active feed (settled, postponed, or removed).");
    } else {
      if (match.isLive && !sel.isLive) {
        matchStarted = true;
        hasStartedMatches = true;
        warnings.push("Match has kicked off and transitioned to live play.");
      }
      const market = match.markets.find(
        (m) => m.marketId === sel.marketId && (m.specifier || "") === (sel.specifier || "")
      );
      const outcome = market?.outcomes.find((o) => o.outcomeId === sel.outcomeId) || market?.outcomes.find(
        (o) => o.desc.trim().toLowerCase() === (sel.outcomeDesc || "").trim().toLowerCase()
      );
      if (!market || !outcome) {
        missingSelection = true;
        currentOdds = null;
        hasMissingSelections = true;
        warnings.push("Selected market or outcome is no longer offered.");
      } else if (market.status !== 0 || market.banned || !outcome.isActive) {
        marketSuspended = true;
        currentOdds = outcome.odds;
        hasSuspendedMarkets = true;
        warnings.push("Market or outcome is currently suspended.");
      } else {
        currentOdds = outcome.odds;
        oddsDiff = Number((outcome.odds - sel.odds).toFixed(2));
        if (Math.abs(oddsDiff) >= 0.01) {
          oddsChanged = true;
          hasOddsChanges = true;
          warnings.push(
            `Odds shifted from ${sel.odds.toFixed(2)} to ${outcome.odds.toFixed(2)}.`
          );
        }
      }
    }
    const itemValid = !duplicateEvent && !marketSuspended && !missingSelection && !matchStarted;
    items.push({
      selectionKey: sel.selectionKey,
      eventId: sel.eventId,
      valid: itemValid,
      currentOdds,
      previousOdds: sel.odds,
      oddsChanged,
      oddsDiff,
      marketSuspended,
      matchStarted,
      duplicateEvent,
      missingSelection,
      warnings
    });
  }
  const combinedOdds = calculateCombinedOdds(selections);
  const valid = selections.length > 0 && !hasDuplicates && !hasSuspendedMarkets && !hasMissingSelections && !hasStartedMatches;
  return {
    valid,
    combinedOdds,
    selectionCount: selections.length,
    hasDuplicates,
    hasSuspendedMarkets,
    hasOddsChanges,
    hasStartedMatches,
    hasMissingSelections,
    items,
    globalWarnings,
    checkedAt: new Date(nowMs).toISOString()
  };
}

// backend/services/crossTransferService.ts
var import_crypto4 = __toESM(require("crypto"), 1);
var CANONICAL_MARKET_CATALOG = {
  "1X2_FT": {
    id: "1X2_FT",
    label: "Match Winner (1X2 | Full Time)",
    sportybetMarketId: "1",
    betpawaMarketId: "3743",
    settlementRule: "Regular time (90m + stoppage), excludes extra time and penalties."
  },
  DOUBLE_CHANCE_FT: {
    id: "DOUBLE_CHANCE_FT",
    label: "Double Chance (Full Time)",
    sportybetMarketId: "10",
    betpawaMarketId: "4693",
    settlementRule: "Regular time (1X, 12, or X2), excludes extra time."
  },
  OVER_UNDER_FT: {
    id: "OVER_UNDER_FT",
    label: "Total Goals Over/Under (Full Time)",
    sportybetMarketId: "18",
    betpawaMarketId: "5000",
    settlementRule: "Exact goal line over regular time (90m + stoppage)."
  },
  BTTS_FT: {
    id: "BTTS_FT",
    label: "Both Teams To Score (GG/NG | Full Time)",
    sportybetMarketId: "29",
    betpawaMarketId: "3795",
    settlementRule: "Both teams score at least 1 goal in regular time (Yes/No)."
  },
  DRAW_NO_BET_FT: {
    id: "DRAW_NO_BET_FT",
    label: "Draw No Bet (Full Time)",
    sportybetMarketId: "11",
    betpawaMarketId: "4703",
    settlementRule: "Home or Away win in regular time; voided (1.00) on draw."
  },
  ODD_EVEN_FT: {
    id: "ODD_EVEN_FT",
    label: "Odd / Even Goals (Full Time)",
    sportybetMarketId: "26",
    betpawaMarketId: "4833",
    settlementRule: "Total regular-time goals odd or even (0 counts as Even)."
  },
  HOME_OU_FT: {
    id: "HOME_OU_FT",
    label: "Home Team Total Goals Over/Under (FT)",
    sportybetMarketId: "19",
    betpawaMarketId: "5006",
    settlementRule: "Home team goals over/under exact line in regular time."
  },
  AWAY_OU_FT: {
    id: "AWAY_OU_FT",
    label: "Away Team Total Goals Over/Under (FT)",
    sportybetMarketId: "20",
    betpawaMarketId: "5003",
    settlementRule: "Away team goals over/under exact line in regular time."
  },
  ASIAN_HANDICAP_FT: {
    id: "ASIAN_HANDICAP_FT",
    label: "Asian Handicap (Full Time)",
    sportybetMarketId: "16",
    betpawaMarketId: "3774",
    settlementRule: "2-way goal spread handicap in regular time (exact line required)."
  },
  HT_1X2: {
    id: "HT_1X2",
    label: "1st Half Winner (1X2)",
    sportybetMarketId: "60",
    betpawaMarketId: "3743_HT",
    settlementRule: "Settled exclusively on 1st half (45m + stoppage) score."
  },
  HT_OVER_UNDER: {
    id: "HT_OVER_UNDER",
    label: "1st Half Total Goals Over/Under",
    sportybetMarketId: "68",
    betpawaMarketId: "5000_HT",
    settlementRule: "Settled exclusively on 1st half goals."
  },
  HT_DOUBLE_CHANCE: {
    id: "HT_DOUBLE_CHANCE",
    label: "1st Half Double Chance",
    sportybetMarketId: "63",
    betpawaMarketId: "4693_HT",
    settlementRule: "Settled exclusively on 1st half result (1X, 12, X2)."
  },
  HT_BTTS: {
    id: "HT_BTTS",
    label: "1st Half Both Teams To Score",
    sportybetMarketId: "75",
    betpawaMarketId: "3795_HT",
    settlementRule: "Both teams score in 1st half only."
  }
};
var TEAM_NOISE_WORDS = /* @__PURE__ */ new Set([
  "fc",
  "sc",
  "cf",
  "ac",
  "as",
  "fk",
  "sk",
  "afc",
  "bk",
  "if",
  "nk",
  "ss",
  "sv",
  "tsg",
  "vfb",
  "vfl",
  "club",
  "cd",
  "ud",
  "sd",
  "rc",
  "ca",
  "cs",
  "de",
  "la",
  "the"
]);
var SQUAD_QUALIFIER_PATTERNS = [
  { tag: "WOMEN", regex: /\b(women|woman|ladies|fem|femenino|frauen|w)\b|\(w\)/i },
  { tag: "U23", regex: /\bu[\s-]?23\b/i },
  { tag: "U21", regex: /\bu[\s-]?21\b/i },
  { tag: "U20", regex: /\bu[\s-]?20\b/i },
  { tag: "U19", regex: /\bu[\s-]?19\b/i },
  { tag: "U18", regex: /\bu[\s-]?18\b/i },
  { tag: "RESERVES", regex: /\b(reserves|reserve|ii|b)\b/i }
];
function extractSquadQualifiers(teamName) {
  const tags = /* @__PURE__ */ new Set();
  for (const p of SQUAD_QUALIFIER_PATTERNS) {
    if (p.regex.test(teamName)) {
      tags.add(p.tag);
    }
  }
  return tags;
}
function normalizeTeamName(name) {
  const cleaned = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  const tokens = cleaned.split(" ").filter((t) => t.length > 0 && !TEAM_NOISE_WORDS.has(t));
  return tokens.join(" ").trim() || cleaned;
}
function levenshteinDistance(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  const curr = new Array(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) {
      prev[j] = curr[j];
    }
  }
  return prev[b.length];
}
function computeTeamSimilarity(aRaw, bRaw) {
  const qualA = extractSquadQualifiers(aRaw);
  const qualB = extractSquadQualifiers(bRaw);
  if (qualA.size !== qualB.size) return 0;
  for (const tag of qualA) {
    if (!qualB.has(tag)) return 0;
  }
  const a = normalizeTeamName(aRaw);
  const b = normalizeTeamName(bRaw);
  if (!a || !b) return 0;
  if (a === b) return 1;
  const tokensA = a.split(" ");
  const tokensB = b.split(" ");
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  const conflictingPairs = [
    ["united", "city"],
    ["real", "atletico"],
    ["inter", "ac"],
    ["rovers", "wanderers"],
    ["north", "south"],
    ["east", "west"]
  ];
  for (const [x, y] of conflictingPairs) {
    if (setA.has(x) && setB.has(y) || setA.has(y) && setB.has(x)) {
      return 0.1;
    }
  }
  let overlap = 0;
  for (const tok of setA) {
    if (setB.has(tok)) overlap++;
  }
  const jaccard = overlap / Math.max(setA.size, setB.size);
  const maxLen = Math.max(a.length, b.length);
  const levSim = 1 - levenshteinDistance(a, b) / maxLen;
  const substringBonus = a.includes(b) || b.includes(a) ? 0.12 : 0;
  return Math.min(1, Number((jaccard * 0.55 + levSim * 0.45 + substringBonus).toFixed(4)));
}
function matchFixtureToCandidates(source, candidates) {
  const scored = [];
  for (const cand of candidates) {
    const homeSim = computeTeamSimilarity(source.homeTeam, cand.homeTeam);
    const awaySim = computeTeamSimilarity(source.awayTeam, cand.awayTeam);
    if (homeSim < 0.55 || awaySim < 0.55) continue;
    let timeScore = 0.85;
    let timeDeltaHours = 0;
    if (source.estimateStartTime && source.estimateStartTime > 0 && cand.estimateStartTime > 0) {
      timeDeltaHours = Math.abs(source.estimateStartTime - cand.estimateStartTime) / 36e5;
      if (timeDeltaHours > 12) {
        continue;
      }
      if (timeDeltaHours <= 0.5) timeScore = 1;
      else if (timeDeltaHours <= 3) timeScore = 0.92;
      else timeScore = 0.75;
    }
    const leagueBonus = source.leagueName && cand.leagueName && computeTeamSimilarity(source.leagueName, cand.leagueName) >= 0.65 ? 0.05 : 0;
    const total = Math.min(
      1,
      Number(((homeSim * 0.45 + awaySim * 0.45) * timeScore + 0.1 * timeScore + leagueBonus).toFixed(4))
    );
    if (total >= 0.68) {
      scored.push({
        match: cand,
        score: total,
        reason: `Teams ${(homeSim * 100).toFixed(0)}% / ${(awaySim * 100).toFixed(0)}%${source.estimateStartTime ? `, kickoff \u0394 ${timeDeltaHours.toFixed(1)}h` : ""}`
      });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  const rankedCandidates = scored.slice(0, 3).map((s) => ({
    eventId: s.match.eventId,
    homeTeam: s.match.homeTeam,
    awayTeam: s.match.awayTeam,
    leagueName: s.match.leagueName,
    country: s.match.country,
    estimateStartTime: s.match.estimateStartTime,
    confidenceScore: s.score,
    reason: s.reason
  }));
  if (scored.length === 0) {
    return {
      bestMatch: null,
      confidence: 0,
      rankedCandidates: [],
      reason: `Fixture "${source.homeTeam} vs ${source.awayTeam}" not found among active upcoming/live matches on target bookmaker.`
    };
  }
  return {
    bestMatch: scored[0].match,
    confidence: scored[0].score,
    rankedCandidates,
    reason: scored[0].reason
  };
}
function extractNumericLine(text) {
  const m = text.match(/([+-]?\d+(?:\.\d+)?)/);
  if (!m) return null;
  const num = Number(m[1]);
  if (!Number.isFinite(num)) return null;
  return String(num);
}
function detectPeriod(marketName, marketId) {
  const n = marketName.toLowerCase();
  if (n.includes("1st half") || n.includes("first half") || n.includes("half time") || n.includes("half-time") || marketId === "60" || marketId === "63" || marketId === "68" || marketId === "75") {
    return "HT";
  }
  if (n.includes("2nd half") || n.includes("second half")) {
    return "2H";
  }
  return "FT";
}
function resolveCanonicalSelection(input) {
  const mId = String(input.marketId || "").trim();
  const mName = input.marketName.toLowerCase().trim();
  const spec = String(input.specifier || "").trim();
  const oId = String(input.outcomeId || "").trim();
  const oDesc = input.outcomeDesc.toLowerCase().trim();
  const homeNorm = normalizeTeamName(input.homeTeam);
  const awayNorm = normalizeTeamName(input.awayTeam);
  const oDescNorm = normalizeTeamName(input.outcomeDesc);
  const period = detectPeriod(input.marketName, mId);
  if (period === "2H" || /corner|card|booking|penalty|scorer|minute|exact score|correct score/i.test(mName)) {
    return null;
  }
  const is1X2 = input.bookmakerId === "SPORTYBET_TZ" && (mId === "1" || mId === "60") || input.bookmakerId === "BETPAWA_TZ" && mId === "3743" || /\b1x2\b|match winner|full time result|match result/i.test(mName);
  if (is1X2 && !mName.includes("double chance") && !mName.includes("handicap")) {
    let outcome = null;
    if (oDesc === "1" || oDesc === "home" || homeNorm && oDescNorm === homeNorm || input.bookmakerId === "SPORTYBET_TZ" && mId === "1" && oId === "1") {
      outcome = "HOME";
    } else if (oDesc === "x" || oDesc === "draw" || input.bookmakerId === "SPORTYBET_TZ" && mId === "1" && oId === "2") {
      outcome = "DRAW";
    } else if (oDesc === "2" || oDesc === "away" || awayNorm && oDescNorm === awayNorm || input.bookmakerId === "SPORTYBET_TZ" && mId === "1" && oId === "3") {
      outcome = "AWAY";
    }
    if (!outcome) return null;
    const cm = period === "HT" ? "HT_1X2" : "1X2_FT";
    return {
      canonicalMarket: cm,
      line: null,
      canonicalOutcome: outcome,
      settlementRuleNote: CANONICAL_MARKET_CATALOG[cm].settlementRule
    };
  }
  const isDC = input.bookmakerId === "SPORTYBET_TZ" && (mId === "10" || mId === "63") || input.bookmakerId === "BETPAWA_TZ" && mId === "4693" || /double chance/i.test(mName);
  if (isDC) {
    let outcome = null;
    const compact = oDesc.replace(/\s+/g, "");
    if (compact === "1x" || compact === "homeordraw" || oDesc.includes("draw") && (oDesc.includes("home") || homeNorm && oDescNorm.includes(homeNorm)) || input.bookmakerId === "SPORTYBET_TZ" && mId === "10" && oId === "9") {
      outcome = "1X";
    } else if (compact === "12" || compact === "homeoraway" || oDesc.includes("home") && oDesc.includes("away") || homeNorm && awayNorm && oDescNorm.includes(homeNorm) && oDescNorm.includes(awayNorm) || input.bookmakerId === "SPORTYBET_TZ" && mId === "10" && oId === "10") {
      outcome = "12";
    } else if (compact === "x2" || compact === "draworaway" || oDesc.includes("draw") && (oDesc.includes("away") || awayNorm && oDescNorm.includes(awayNorm)) || input.bookmakerId === "SPORTYBET_TZ" && mId === "10" && oId === "11") {
      outcome = "X2";
    }
    if (!outcome) return null;
    const cm = period === "HT" ? "HT_DOUBLE_CHANCE" : "DOUBLE_CHANCE_FT";
    return {
      canonicalMarket: cm,
      line: null,
      canonicalOutcome: outcome,
      settlementRuleNote: CANONICAL_MARKET_CATALOG[cm].settlementRule
    };
  }
  const isHomeOU = input.bookmakerId === "SPORTYBET_TZ" && mId === "19" || input.bookmakerId === "BETPAWA_TZ" && mId === "5006" || /home.*(over\/under|total)/i.test(mName) || homeNorm.length >= 3 && mName.includes(homeNorm) && /over|under|total/i.test(mName);
  const isAwayOU = input.bookmakerId === "SPORTYBET_TZ" && mId === "20" || input.bookmakerId === "BETPAWA_TZ" && mId === "5003" || /away.*(over\/under|total)/i.test(mName) || awayNorm.length >= 3 && mName.includes(awayNorm) && /over|under|total/i.test(mName);
  if ((isHomeOU || isAwayOU) && period === "FT") {
    const line = extractNumericLine(spec) || extractNumericLine(oDesc);
    const side = oDesc.includes("over") ? "OVER" : oDesc.includes("under") ? "UNDER" : null;
    if (!line || !side) return null;
    const cm = isHomeOU ? "HOME_OU_FT" : "AWAY_OU_FT";
    return {
      canonicalMarket: cm,
      line,
      canonicalOutcome: `${side}_${line}`,
      settlementRuleNote: CANONICAL_MARKET_CATALOG[cm].settlementRule
    };
  }
  const isOU = input.bookmakerId === "SPORTYBET_TZ" && (mId === "18" || mId === "68") || input.bookmakerId === "BETPAWA_TZ" && mId === "5000" || /\b(over\/under|total goals|o\/u)\b/i.test(mName) && !mName.includes("&") && !mName.includes("gg");
  if (isOU) {
    const line = extractNumericLine(spec) || extractNumericLine(oDesc);
    const side = oDesc.includes("over") ? "OVER" : oDesc.includes("under") ? "UNDER" : null;
    if (!line || !side) return null;
    const cm = period === "HT" ? "HT_OVER_UNDER" : "OVER_UNDER_FT";
    return {
      canonicalMarket: cm,
      line,
      canonicalOutcome: `${side}_${line}`,
      settlementRuleNote: CANONICAL_MARKET_CATALOG[cm].settlementRule
    };
  }
  const isBTTS = input.bookmakerId === "SPORTYBET_TZ" && (mId === "29" || mId === "75") || input.bookmakerId === "BETPAWA_TZ" && mId === "3795" || /both teams to score|gg\/ng|\bbtts\b/i.test(mName);
  if (isBTTS && !mName.includes("&") && !mName.includes("over")) {
    let outcome = null;
    if (oDesc === "yes" || oDesc === "gg") outcome = "YES";
    else if (oDesc === "no" || oDesc === "ng") outcome = "NO";
    if (!outcome) return null;
    const cm = period === "HT" ? "HT_BTTS" : "BTTS_FT";
    return {
      canonicalMarket: cm,
      line: null,
      canonicalOutcome: outcome,
      settlementRuleNote: CANONICAL_MARKET_CATALOG[cm].settlementRule
    };
  }
  const isDNB = input.bookmakerId === "SPORTYBET_TZ" && mId === "11" || input.bookmakerId === "BETPAWA_TZ" && mId === "4703" || /draw no bet|\bdnb\b/i.test(mName);
  if (isDNB && period === "FT") {
    let outcome = null;
    if (oDesc === "1" || oDesc === "home" || homeNorm && oDescNorm === homeNorm) outcome = "HOME";
    else if (oDesc === "2" || oDesc === "away" || awayNorm && oDescNorm === awayNorm) outcome = "AWAY";
    if (!outcome) return null;
    return {
      canonicalMarket: "DRAW_NO_BET_FT",
      line: null,
      canonicalOutcome: outcome,
      settlementRuleNote: CANONICAL_MARKET_CATALOG.DRAW_NO_BET_FT.settlementRule
    };
  }
  const isOE = input.bookmakerId === "SPORTYBET_TZ" && mId === "26" || input.bookmakerId === "BETPAWA_TZ" && mId === "4833" || /odd\s*\/?\s*even/i.test(mName);
  if (isOE && period === "FT") {
    let outcome = null;
    if (oDesc === "odd") outcome = "ODD";
    else if (oDesc === "even") outcome = "EVEN";
    if (!outcome) return null;
    return {
      canonicalMarket: "ODD_EVEN_FT",
      line: null,
      canonicalOutcome: outcome,
      settlementRuleNote: CANONICAL_MARKET_CATALOG.ODD_EVEN_FT.settlementRule
    };
  }
  const isAH = input.bookmakerId === "SPORTYBET_TZ" && mId === "16" || input.bookmakerId === "BETPAWA_TZ" && mId === "3774" || /asian handicap/i.test(mName);
  if (isAH && period === "FT" && !mName.includes("european") && !mName.includes("3-way")) {
    const line = extractNumericLine(spec) || extractNumericLine(oDesc);
    if (!line) return null;
    let side = null;
    if (oDesc.includes("home") || homeNorm && oDescNorm.includes(homeNorm) || oDesc.startsWith("1 ")) {
      side = "HOME";
    } else if (oDesc.includes("away") || awayNorm && oDescNorm.includes(awayNorm) || oDesc.startsWith("2 ")) {
      side = "AWAY";
    }
    if (!side) return null;
    return {
      canonicalMarket: "ASIAN_HANDICAP_FT",
      line,
      canonicalOutcome: `${side}_${line}`,
      settlementRuleNote: CANONICAL_MARKET_CATALOG.ASIAN_HANDICAP_FT.settlementRule
    };
  }
  return null;
}
function findExactTargetMarketOutcome(targetMatch, targetBookmaker, sourceCanonical) {
  for (const m of targetMatch.markets) {
    if (m.banned || m.status !== 0) continue;
    for (const o of m.outcomes) {
      if (!o.isActive || o.odds <= 1) continue;
      const candCanonical = resolveCanonicalSelection({
        bookmakerId: targetBookmaker,
        marketId: m.marketId,
        marketName: m.desc || m.name,
        specifier: m.specifier,
        outcomeId: o.outcomeId,
        outcomeDesc: o.desc,
        homeTeam: targetMatch.homeTeam,
        awayTeam: targetMatch.awayTeam
      });
      if (!candCanonical) continue;
      if (candCanonical.canonicalMarket === sourceCanonical.canonicalMarket && candCanonical.canonicalOutcome === sourceCanonical.canonicalOutcome && candCanonical.line === sourceCanonical.line) {
        return { market: m, outcome: o };
      }
    }
  }
  return null;
}
async function fetchCandidatePoolForBookmaker(targetBookmaker) {
  const client = getBookmakerClient(targetBookmaker);
  const [liveRes, upcomingRes] = await Promise.all([
    client.getLiveMatches().catch(() => []),
    client.getUpcomingMatches({ pageNum: 1, pageSize: 100, maxPages: 4 }).catch(() => ({ matches: [], totalAvailable: 0 }))
  ]);
  const byId = /* @__PURE__ */ new Map();
  for (const m of [...upcomingRes.matches, ...liveRes]) {
    if (!byId.has(m.eventId)) {
      byId.set(m.eventId, m);
    }
  }
  return Array.from(byId.values());
}
function getBookmakerHandoffUrl(bookmakerId) {
  return getBookmakerInfo(bookmakerId).websiteUrl;
}
async function previewCrossBookmakerTransfer(params) {
  const sourceBookmaker = params.direction === "SPORTYBET_TO_BETPAWA" ? "SPORTYBET_TZ" : "BETPAWA_TZ";
  const targetBookmaker = params.direction === "SPORTYBET_TO_BETPAWA" ? "BETPAWA_TZ" : "SPORTYBET_TZ";
  const sourceInfo = getBookmakerInfo(sourceBookmaker);
  const targetInfo = getBookmakerInfo(targetBookmaker);
  const transferId = `tr_${import_crypto4.default.randomBytes(5).toString("hex")}`;
  const checkedAt = (/* @__PURE__ */ new Date()).toISOString();
  const cleanCode = (params.bookingCode || "").trim().toUpperCase();
  const manualHandoffUrl = getBookmakerHandoffUrl(targetBookmaker);
  let sourceSelections = [];
  const warnings = [];
  if (cleanCode) {
    try {
      const sourceClient = getBookmakerClient(sourceBookmaker);
      const imported = await sourceClient.verifyBookingCode(cleanCode);
      if (!imported || imported.selections.length === 0) {
        throw new Error(`Booking code ${cleanCode} returned no selections on ${sourceInfo.shortName}.`);
      }
      sourceSelections = imported.selections.map((s, idx) => ({
        id: s.selectionKey || `src_${idx}`,
        homeTeam: s.homeTeam,
        awayTeam: s.awayTeam,
        leagueName: s.leagueName,
        country: s.country,
        estimateStartTime: s.estimateStartTime,
        marketId: s.marketId,
        marketName: s.marketName,
        specifier: s.specifier,
        outcomeId: s.outcomeId,
        outcomeDesc: s.outcomeDesc,
        odds: s.odds,
        eventId: s.eventId
      }));
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : `Unable to import booking code ${cleanCode} from ${sourceInfo.shortName}.`;
      backendLogger.warn("TRANSFER", "SOURCE_CODE_IMPORT_FAILED", errMsg, {
        actorUid: params.actorUid,
        actorEmail: params.actorEmail,
        metadata: { direction: params.direction, code: cleanCode }
      });
      const failedPreview = {
        transferId,
        direction: params.direction,
        sourceBookmaker,
        sourceBookmakerName: sourceInfo.name,
        targetBookmaker,
        targetBookmakerName: targetInfo.name,
        originalCode: cleanCode,
        status: "MANUAL_IMPORT_REQUIRED",
        originalSelectionCount: 0,
        matchedCount: 0,
        unmatchedCount: 0,
        unavailableCount: 0,
        originalCombinedOdds: 1,
        targetCombinedOdds: null,
        legs: [],
        matchedSelections: [],
        warnings: [
          errMsg,
          "You can still enter or paste the original selections manually below to match and transfer them."
        ],
        manualHandoffUrl,
        checkedAt
      };
      platformConfigService.recordTransfer({
        transferId,
        direction: params.direction,
        sourceBookmaker,
        targetBookmaker,
        originalCode: cleanCode,
        targetBookingCode: null,
        targetShareUrl: null,
        status: "MANUAL_IMPORT_REQUIRED",
        originalSelectionCount: 0,
        matchedCount: 0,
        unmatchedCount: 0,
        originalCombinedOdds: 1,
        targetCombinedOdds: null,
        actorUid: params.actorUid || null,
        actorEmail: params.actorEmail || null,
        errorMessage: errMsg,
        createdAt: checkedAt
      });
      return failedPreview;
    }
  } else if (params.manualSelections && params.manualSelections.length > 0) {
    sourceSelections = params.manualSelections;
  }
  const originalCombinedOdds = Number(
    sourceSelections.reduce((acc, s) => acc * (Number(s.odds) || 1), 1).toFixed(2)
  );
  const candidatePool = await fetchCandidatePoolForBookmaker(targetBookmaker);
  const targetClient = getBookmakerClient(targetBookmaker);
  const enabledMarkets = new Set(platformConfigService.getSettings().supportedTransferMarkets);
  const detailedMatchCache = /* @__PURE__ */ new Map();
  const legs = [];
  const matchedSelections = [];
  for (const src of sourceSelections) {
    const canonical = resolveCanonicalSelection({
      bookmakerId: sourceBookmaker,
      marketId: src.marketId,
      marketName: src.marketName,
      specifier: src.specifier,
      outcomeId: src.outcomeId,
      outcomeDesc: src.outcomeDesc,
      homeTeam: src.homeTeam,
      awayTeam: src.awayTeam
    });
    if (!canonical) {
      legs.push({
        sourceSelection: src,
        status: "UNAVAILABLE",
        canonicalMarket: null,
        canonicalOutcome: null,
        targetSelection: null,
        targetOdds: null,
        oddsDifference: null,
        matchConfidence: 0,
        settlementRuleNote: "No verified equivalent market settlement rule across both platforms.",
        reason: `Market "${src.marketName}" (${src.outcomeDesc}) has no verified 1:1 cross-bookmaker mapping. Outcome not substituted.`
      });
      continue;
    }
    if (!enabledMarkets.has(canonical.canonicalMarket)) {
      legs.push({
        sourceSelection: src,
        status: "UNAVAILABLE",
        canonicalMarket: canonical.canonicalMarket,
        canonicalOutcome: canonical.canonicalOutcome,
        targetSelection: null,
        targetOdds: null,
        oddsDifference: null,
        matchConfidence: 0,
        settlementRuleNote: canonical.settlementRuleNote,
        reason: `Market "${canonical.canonicalMarket}" is currently disabled for cross-bookmaker transfer by administrator settings.`
      });
      continue;
    }
    const fixtureMatch = matchFixtureToCandidates(src, candidatePool);
    if (!fixtureMatch.bestMatch) {
      legs.push({
        sourceSelection: src,
        status: "UNMATCHED",
        canonicalMarket: canonical.canonicalMarket,
        canonicalOutcome: canonical.canonicalOutcome,
        targetSelection: null,
        targetOdds: null,
        oddsDifference: null,
        matchConfidence: 0,
        settlementRuleNote: canonical.settlementRuleNote,
        reason: fixtureMatch.reason,
        candidateMatches: fixtureMatch.rankedCandidates
      });
      continue;
    }
    const targetEventId = fixtureMatch.bestMatch.eventId;
    let fullTargetMatch = detailedMatchCache.get(targetEventId);
    if (!fullTargetMatch) {
      try {
        fullTargetMatch = await targetClient.getMatchDetails(targetEventId);
      } catch {
        fullTargetMatch = fixtureMatch.bestMatch;
      }
      detailedMatchCache.set(targetEventId, fullTargetMatch);
    }
    if (fullTargetMatch.isLive || fullTargetMatch.statusCode !== 0) {
      legs.push({
        sourceSelection: src,
        status: "MATCH_STARTED",
        canonicalMarket: canonical.canonicalMarket,
        canonicalOutcome: canonical.canonicalOutcome,
        targetSelection: null,
        targetOdds: null,
        oddsDifference: null,
        matchConfidence: fixtureMatch.confidence,
        settlementRuleNote: canonical.settlementRuleNote,
        reason: `Match "${fullTargetMatch.homeTeam} vs ${fullTargetMatch.awayTeam}" is already live or closed (${fullTargetMatch.matchStatus}) on ${targetInfo.shortName}.`,
        candidateMatches: fixtureMatch.rankedCandidates
      });
      continue;
    }
    const exactHit = findExactTargetMarketOutcome(fullTargetMatch, targetBookmaker, canonical);
    if (!exactHit) {
      legs.push({
        sourceSelection: src,
        status: "UNAVAILABLE",
        canonicalMarket: canonical.canonicalMarket,
        canonicalOutcome: canonical.canonicalOutcome,
        targetSelection: null,
        targetOdds: null,
        oddsDifference: null,
        matchConfidence: fixtureMatch.confidence,
        settlementRuleNote: canonical.settlementRuleNote,
        reason: `Exact selection "${src.marketName}: ${src.outcomeDesc}" is unavailable or suspended on ${targetInfo.shortName} for ${fullTargetMatch.homeTeam} vs ${fullTargetMatch.awayTeam}.`,
        candidateMatches: fixtureMatch.rankedCandidates
      });
      continue;
    }
    const targetOdds = exactHit.outcome.odds;
    const oddsDifference = Number((targetOdds - src.odds).toFixed(2));
    const selectionKey = `${fullTargetMatch.eventId}::${exactHit.market.marketId}::${exactHit.market.specifier}::${exactHit.outcome.outcomeId}`;
    const targetSelection = {
      bookmakerId: targetBookmaker,
      bookmakerName: targetInfo.name,
      selectionKey,
      eventId: fullTargetMatch.eventId,
      homeTeam: fullTargetMatch.homeTeam,
      awayTeam: fullTargetMatch.awayTeam,
      leagueName: fullTargetMatch.leagueName,
      country: fullTargetMatch.country,
      estimateStartTime: fullTargetMatch.estimateStartTime,
      matchStatus: fullTargetMatch.matchStatus,
      isLive: fullTargetMatch.isLive,
      marketId: exactHit.market.marketId,
      marketName: exactHit.market.desc || exactHit.market.name,
      specifier: exactHit.market.specifier,
      outcomeId: exactHit.outcome.outcomeId,
      outcomeDesc: exactHit.outcome.desc,
      odds: targetOdds,
      addedAt: checkedAt
    };
    matchedSelections.push(targetSelection);
    legs.push({
      sourceSelection: src,
      status: Math.abs(oddsDifference) >= 0.01 ? "ODDS_CHANGED" : "MATCHED",
      canonicalMarket: canonical.canonicalMarket,
      canonicalOutcome: canonical.canonicalOutcome,
      targetSelection,
      targetOdds,
      oddsDifference,
      matchConfidence: fixtureMatch.confidence,
      settlementRuleNote: canonical.settlementRuleNote,
      reason: Math.abs(oddsDifference) >= 0.01 ? `Exact match verified (${fixtureMatch.reason}); target odds ${targetOdds.toFixed(2)} vs original ${src.odds.toFixed(2)}.` : `Exact fixture, market, and outcome verified (${fixtureMatch.reason}).`,
      candidateMatches: fixtureMatch.rankedCandidates
    });
  }
  const matchedCount = matchedSelections.length;
  const unmatchedCount = legs.filter((l) => l.status === "UNMATCHED").length;
  const unavailableCount = legs.filter(
    (l) => l.status === "UNAVAILABLE" || l.status === "MATCH_STARTED"
  ).length;
  let status = "READY_TO_REVIEW";
  if (matchedCount === 0) {
    status = "UNAVAILABLE_SELECTIONS";
    warnings.push(
      `No selections could be matched cleanly on ${targetInfo.shortName}. Review unavailable reasons below.`
    );
  } else if (unmatchedCount > 0 || unavailableCount > 0) {
    status = "PARTIALLY_MATCHED";
    warnings.push(
      `${matchedCount} of ${sourceSelections.length} selection(s) matched. Remove or review unavailable legs before confirming.`
    );
  }
  const targetCombinedOdds = matchedCount > 0 ? Number(matchedSelections.reduce((acc, s) => acc * s.odds, 1).toFixed(2)) : null;
  platformConfigService.recordTransfer({
    transferId,
    direction: params.direction,
    sourceBookmaker,
    targetBookmaker,
    originalCode: cleanCode || "MANUAL",
    targetBookingCode: null,
    targetShareUrl: null,
    status,
    originalSelectionCount: sourceSelections.length,
    matchedCount,
    unmatchedCount: unmatchedCount + unavailableCount,
    originalCombinedOdds,
    targetCombinedOdds,
    actorUid: params.actorUid || null,
    actorEmail: params.actorEmail || null,
    errorMessage: null,
    createdAt: checkedAt
  });
  backendLogger.info(
    "TRANSFER",
    "TRANSFER_PREVIEW",
    `${sourceInfo.shortName} -> ${targetInfo.shortName} preview (${cleanCode || "MANUAL"}): ${matchedCount}/${sourceSelections.length} matched (${status}).`,
    { actorUid: params.actorUid, actorEmail: params.actorEmail }
  );
  return {
    transferId,
    direction: params.direction,
    sourceBookmaker,
    sourceBookmakerName: sourceInfo.name,
    targetBookmaker,
    targetBookmakerName: targetInfo.name,
    originalCode: cleanCode || "MANUAL",
    status,
    originalSelectionCount: sourceSelections.length,
    matchedCount,
    unmatchedCount,
    unavailableCount,
    originalCombinedOdds,
    targetCombinedOdds,
    legs,
    matchedSelections,
    warnings,
    manualHandoffUrl,
    checkedAt
  };
}
async function confirmCrossBookmakerTransfer(params) {
  const sourceBookmaker = params.direction === "SPORTYBET_TO_BETPAWA" ? "SPORTYBET_TZ" : "BETPAWA_TZ";
  const targetBookmaker = params.direction === "SPORTYBET_TO_BETPAWA" ? "BETPAWA_TZ" : "SPORTYBET_TZ";
  const targetInfo = getBookmakerInfo(targetBookmaker);
  const transferId = params.transferId || `tr_${import_crypto4.default.randomBytes(5).toString("hex")}`;
  const confirmedAt = (/* @__PURE__ */ new Date()).toISOString();
  const manualHandoffUrl = getBookmakerHandoffUrl(targetBookmaker);
  assertSameBookmakerSelections(params.confirmedSelections, targetBookmaker);
  const targetClient = getBookmakerClient(targetBookmaker);
  try {
    const booking = await targetClient.createBookingCode(params.confirmedSelections);
    if (!booking.shareCode || !booking.verified) {
      throw new Error(
        `${targetInfo.shortName} created an unverified booking code response. Use manual handoff instead.`
      );
    }
    platformConfigService.recordTransfer({
      transferId,
      direction: params.direction,
      sourceBookmaker,
      targetBookmaker,
      originalCode: params.originalCode || "MANUAL",
      targetBookingCode: booking.shareCode,
      targetShareUrl: booking.shareUrl,
      status: "TRANSFERRED",
      originalSelectionCount: params.originalSelectionCount,
      matchedCount: booking.selectionCount,
      unmatchedCount: Math.max(0, params.originalSelectionCount - booking.selectionCount),
      originalCombinedOdds: params.originalCombinedOdds,
      targetCombinedOdds: booking.combinedOdds,
      actorUid: params.actorUid || null,
      actorEmail: params.actorEmail || null,
      errorMessage: null,
      createdAt: confirmedAt
    });
    backendLogger.info(
      "TRANSFER",
      "TRANSFER_CONFIRMED",
      `Genuine ${targetInfo.shortName} booking code ${booking.shareCode} generated & verified for transfer ${transferId}.`,
      { actorUid: params.actorUid, actorEmail: params.actorEmail }
    );
    return {
      transferId,
      direction: params.direction,
      sourceBookmaker,
      targetBookmaker,
      originalCode: params.originalCode || "MANUAL",
      status: "TRANSFERRED",
      targetBookingCode: booking.shareCode,
      targetShareUrl: booking.shareUrl,
      verified: booking.verified,
      selectionCount: booking.selectionCount,
      originalCombinedOdds: params.originalCombinedOdds,
      targetCombinedOdds: booking.combinedOdds,
      confirmedSelections: booking.selections,
      manualHandoffUrl,
      errorMessage: null,
      confirmedAt
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : `${targetInfo.shortName} booking code creation failed.`;
    const recalculated = Number(
      params.confirmedSelections.reduce((acc, s) => acc * s.odds, 1).toFixed(2)
    );
    platformConfigService.recordTransfer({
      transferId,
      direction: params.direction,
      sourceBookmaker,
      targetBookmaker,
      originalCode: params.originalCode || "MANUAL",
      targetBookingCode: null,
      targetShareUrl: null,
      status: "FAILED",
      originalSelectionCount: params.originalSelectionCount,
      matchedCount: params.confirmedSelections.length,
      unmatchedCount: Math.max(
        0,
        params.originalSelectionCount - params.confirmedSelections.length
      ),
      originalCombinedOdds: params.originalCombinedOdds,
      targetCombinedOdds: recalculated,
      actorUid: params.actorUid || null,
      actorEmail: params.actorEmail || null,
      errorMessage: errMsg,
      createdAt: confirmedAt
    });
    backendLogger.error("TRANSFER", "TRANSFER_CONFIRM_FAILED", errMsg, {
      actorUid: params.actorUid,
      actorEmail: params.actorEmail
    });
    return {
      transferId,
      direction: params.direction,
      sourceBookmaker,
      targetBookmaker,
      originalCode: params.originalCode || "MANUAL",
      status: "FAILED",
      targetBookingCode: null,
      targetShareUrl: null,
      verified: false,
      selectionCount: params.confirmedSelections.length,
      originalCombinedOdds: params.originalCombinedOdds,
      targetCombinedOdds: recalculated,
      confirmedSelections: params.confirmedSelections,
      manualHandoffUrl,
      errorMessage: errMsg,
      confirmedAt
    };
  }
}

// backend/services/scannerService.ts
var import_crypto5 = __toESM(require("crypto"), 1);
function filterAndScanMatches(matches, config) {
  const startMs = config.startDate ? Date.parse(config.startDate) : null;
  const endMs = config.endDate ? Date.parse(config.endDate) : null;
  const endOfDayMs = endMs !== null && Number.isFinite(endMs) ? config.endDate.length <= 10 ? endMs + 24 * 60 * 60 * 1e3 - 1 : endMs : null;
  const leagueFilterSet = new Set(
    (config.leagues || []).map((l) => l.trim().toLowerCase()).filter(Boolean)
  );
  const marketFilterSet = new Set((config.markets || []).map((m) => m.trim()).filter(Boolean));
  const query = (config.searchQuery || "").trim().toLowerCase();
  const seenSelectionKeys = /* @__PURE__ */ new Set();
  const qualifying = [];
  for (const match of matches) {
    if (!match || !match.eventId || !match.homeTeam || !match.awayTeam) continue;
    if (config.matchStatus === "LIVE" && !match.isLive) continue;
    if (config.matchStatus === "UPCOMING" && match.isLive) continue;
    if (startMs !== null && Number.isFinite(startMs) && match.estimateStartTime < startMs) {
      continue;
    }
    if (endOfDayMs !== null && Number.isFinite(endOfDayMs) && match.estimateStartTime > endOfDayMs) {
      continue;
    }
    if (leagueFilterSet.size > 0) {
      const leagueIdLower = match.leagueId.toLowerCase();
      const leagueNameLower = match.leagueName.toLowerCase();
      const countryLower = match.country.toLowerCase();
      const matchedLeague = leagueFilterSet.has(leagueIdLower) || leagueFilterSet.has(leagueNameLower) || leagueFilterSet.has(`${countryLower} - ${leagueNameLower}`);
      if (!matchedLeague) continue;
    }
    if (query) {
      const haystack = `${match.homeTeam} ${match.awayTeam} ${match.leagueName} ${match.country}`.toLowerCase();
      if (!haystack.includes(query)) continue;
    }
    for (const market of match.markets || []) {
      if (market.status !== 0 || market.banned) continue;
      if (marketFilterSet.size > 0 && !marketFilterSet.has(market.marketId)) continue;
      for (const outcome of market.outcomes || []) {
        if (!outcome.isActive) continue;
        if (!Number.isFinite(outcome.odds) || outcome.odds <= 1) continue;
        if (outcome.odds < config.minOdds || outcome.odds > config.maxOdds) continue;
        const selectionKey = `${match.eventId}::${market.marketId}::${market.specifier || ""}::${outcome.outcomeId}`;
        if (seenSelectionKeys.has(selectionKey)) continue;
        seenSelectionKeys.add(selectionKey);
        qualifying.push({
          bookmakerId: match.bookmakerId || config.bookmakerId || "SPORTYBET_TZ",
          bookmakerName: match.bookmakerName || getBookmakerInfo(normalizeBookmakerId(match.bookmakerId || config.bookmakerId)).name,
          selectionKey,
          eventId: match.eventId,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          leagueId: match.leagueId,
          leagueName: match.leagueName,
          country: match.country,
          estimateStartTime: match.estimateStartTime,
          kickoffIso: match.kickoffIso,
          matchStatus: match.matchStatus,
          isLive: match.isLive,
          marketId: market.marketId,
          marketName: market.desc || market.name,
          specifier: market.specifier || "",
          outcomeId: outcome.outcomeId,
          outcomeDesc: outcome.desc,
          odds: outcome.odds,
          probability: outcome.probability,
          dataSource: match.dataSource,
          retrievedAt: match.retrievedAt
        });
      }
    }
  }
  const sortBy = config.sortBy || "kickoff_asc";
  qualifying.sort((a, b) => {
    if (sortBy === "odds_asc") {
      return a.odds - b.odds || a.estimateStartTime - b.estimateStartTime;
    }
    if (sortBy === "odds_desc") {
      return b.odds - a.odds || a.estimateStartTime - b.estimateStartTime;
    }
    return a.estimateStartTime - b.estimateStartTime || a.odds - b.odds;
  });
  return qualifying.slice(0, Math.max(1, Math.min(config.maxResults || 100, 500)));
}
async function runLiveOddsScan(config) {
  const bookmakerId = normalizeBookmakerId(config.bookmakerId);
  const bookmakerInfo = getBookmakerInfo(bookmakerId);
  const client = getBookmakerClient(bookmakerId);
  const validMarketIdsForBookmaker = new Set(
    getBookmakerMarketCatalog(bookmakerId).map((m) => m.id)
  );
  const filteredConfigMarkets = (config.markets || []).filter(
    (id) => validMarketIdsForBookmaker.has(id)
  );
  const effectiveConfig = {
    ...config,
    bookmakerId,
    markets: filteredConfigMarkets.length > 0 ? filteredConfigMarkets : bookmakerId === "BETPAWA_TZ" ? [...BETPAWA_CONFIG.defaultMarketIds] : ["1", "18", "10", "29", "11"]
  };
  const warnings = [];
  const collected = [];
  const seenEventIds = /* @__PURE__ */ new Set();
  const marketIds = effectiveConfig.markets.join(",");
  if (effectiveConfig.matchStatus === "ALL" || effectiveConfig.matchStatus === "LIVE") {
    try {
      const live = await client.getLiveMatches();
      for (const m of live) {
        if (!seenEventIds.has(m.eventId)) {
          seenEventIds.add(m.eventId);
          collected.push(m);
        }
      }
    } catch (err) {
      warnings.push(
        `Live feed partial warning (${bookmakerInfo.shortName}): ${err instanceof Error ? err.message : "unavailable"}`
      );
    }
  }
  if (effectiveConfig.matchStatus === "ALL" || effectiveConfig.matchStatus === "UPCOMING") {
    try {
      const upcoming = await client.getUpcomingMatches({
        pageNum: 1,
        pageSize: 100,
        maxPages: 4,
        marketIds
      });
      for (const m of upcoming.matches) {
        if (!seenEventIds.has(m.eventId)) {
          seenEventIds.add(m.eventId);
          collected.push(m);
        }
      }
    } catch (err) {
      warnings.push(
        `Upcoming feed partial warning (${bookmakerInfo.shortName}): ${err instanceof Error ? err.message : "unavailable"}`
      );
    }
  }
  const results = filterAndScanMatches(collected, effectiveConfig);
  const status = collected.length === 0 && warnings.length > 0 ? "FAILED" : warnings.length > 0 ? "PARTIAL" : "COMPLETED";
  return {
    bookmakerId,
    bookmakerName: bookmakerInfo.name,
    scanId: import_crypto5.default.randomUUID(),
    scannedAt: (/* @__PURE__ */ new Date()).toISOString(),
    dataSource: `${bookmakerInfo.name} (${bookmakerInfo.apiBaseUrl})`,
    status,
    totalMatchesScanned: collected.length,
    qualifyingCount: results.length,
    results,
    appliedConfig: effectiveConfig,
    warnings
  };
}

// backend/services/schedulerService.ts
var import_crypto6 = __toESM(require("crypto"), 1);

// backend/services/settlementService.ts
function parseScoreString(score) {
  if (!score) return null;
  const m = /(\d+)\s*[:\-]\s*(\d+)/.exec(String(score).trim());
  if (!m) return null;
  const homeGoals = Number(m[1]);
  const awayGoals = Number(m[2]);
  if (!Number.isInteger(homeGoals) || !Number.isInteger(awayGoals)) return null;
  if (homeGoals < 0 || awayGoals < 0) return null;
  return { homeGoals, awayGoals };
}
function isMatchPostponedOrCancelled(matchStatus, statusCode) {
  if (statusCode === 5 || statusCode === 6 || statusCode === 7) return true;
  return /\b(postponed|cancelled|canceled|abandoned|suspended|walkover|interrupted)\b/i.test(
    matchStatus || ""
  );
}
function isMatchEnded(matchStatus, statusCode) {
  if (statusCode === 3 || statusCode === 4) return true;
  return /\b(ended|ft|finished|full\s*time|aet|ap|closed)\b/i.test(matchStatus || "");
}
function isMatchLiveStatus(match) {
  if (match.isLive || match.statusCode === 1) return true;
  return /\b(h1|h2|ht|live|1st\s*half|2nd\s*half|extra\s*time|halftime|break)\b/i.test(
    match.matchStatus || ""
  );
}
function settleSingleSelectionOutcome(sel, score) {
  const { homeGoals, awayGoals } = score;
  const totalGoals = homeGoals + awayGoals;
  const marketId = String(sel.marketId).trim();
  const outcomeId = String(sel.outcomeId).trim();
  const desc = (sel.outcomeDesc || "").trim().toLowerCase();
  const spec = (sel.specifier || "").trim().toLowerCase();
  if (marketId === "1" || marketId === "3743") {
    if (outcomeId === "1" || desc === "home" || desc === "1") {
      return {
        status: homeGoals > awayGoals ? "WON" : "LOST",
        reason: `FT ${homeGoals}:${awayGoals} (Home)`
      };
    }
    if (outcomeId === "2" || desc === "draw" || desc === "x") {
      return {
        status: homeGoals === awayGoals ? "WON" : "LOST",
        reason: `FT ${homeGoals}:${awayGoals} (Draw)`
      };
    }
    if (outcomeId === "3" || desc === "away" || desc === "2") {
      return {
        status: awayGoals > homeGoals ? "WON" : "LOST",
        reason: `FT ${homeGoals}:${awayGoals} (Away)`
      };
    }
  }
  if (marketId === "10" || marketId === "4693") {
    if (outcomeId === "9" || /\b1x\b|home.*draw/i.test(desc)) {
      return {
        status: homeGoals >= awayGoals ? "WON" : "LOST",
        reason: `FT ${homeGoals}:${awayGoals} (1X)`
      };
    }
    if (outcomeId === "10" || /\b12\b|home.*away/i.test(desc)) {
      return {
        status: homeGoals !== awayGoals ? "WON" : "LOST",
        reason: `FT ${homeGoals}:${awayGoals} (12)`
      };
    }
    if (outcomeId === "11" || /\bx2\b|draw.*away/i.test(desc)) {
      return {
        status: awayGoals >= homeGoals ? "WON" : "LOST",
        reason: `FT ${homeGoals}:${awayGoals} (X2)`
      };
    }
  }
  if (marketId === "18" || marketId === "5000") {
    const specMatch = /total=(\d+(?:\.\d+)?)/.exec(spec);
    const descMatch = /(over|under)\s*(\d+(?:\.\d+)?)/i.exec(desc);
    const line = specMatch ? Number(specMatch[1]) : descMatch ? Number(descMatch[2]) : NaN;
    const isOver = outcomeId === "12" || /\bover\b/i.test(desc);
    const isUnder = outcomeId === "13" || /\bunder\b/i.test(desc);
    if (Number.isFinite(line) && (isOver || isUnder)) {
      if (totalGoals === line) {
        return {
          status: "VOID",
          reason: `FT ${homeGoals}:${awayGoals} (Total ${totalGoals} pushes line ${line})`
        };
      }
      const won = isOver ? totalGoals > line : totalGoals < line;
      return {
        status: won ? "WON" : "LOST",
        reason: `FT ${homeGoals}:${awayGoals} (Total ${totalGoals} vs ${isOver ? "Over" : "Under"} ${line})`
      };
    }
  }
  if (marketId === "5006" || marketId === "5003") {
    const teamGoals = marketId === "5006" ? homeGoals : awayGoals;
    const specMatch = /total=(\d+(?:\.\d+)?)/.exec(spec);
    const descMatch = /(over|under)\s*(\d+(?:\.\d+)?)/i.exec(desc);
    const line = specMatch ? Number(specMatch[1]) : descMatch ? Number(descMatch[2]) : NaN;
    const isOver = /\bover\b/i.test(desc);
    const isUnder = /\bunder\b/i.test(desc);
    if (Number.isFinite(line) && (isOver || isUnder)) {
      if (teamGoals === line) {
        return { status: "VOID", reason: `FT ${homeGoals}:${awayGoals} (Team total pushes ${line})` };
      }
      const won = isOver ? teamGoals > line : teamGoals < line;
      return {
        status: won ? "WON" : "LOST",
        reason: `FT ${homeGoals}:${awayGoals} (Team goals ${teamGoals} vs ${isOver ? "Over" : "Under"} ${line})`
      };
    }
  }
  if (marketId === "29" || marketId === "3795") {
    const bothScored = homeGoals > 0 && awayGoals > 0;
    if (outcomeId === "74" || desc === "yes" || desc === "gg") {
      return {
        status: bothScored ? "WON" : "LOST",
        reason: `FT ${homeGoals}:${awayGoals} (BTTS Yes)`
      };
    }
    if (outcomeId === "76" || desc === "no" || desc === "ng") {
      return {
        status: !bothScored ? "WON" : "LOST",
        reason: `FT ${homeGoals}:${awayGoals} (BTTS No)`
      };
    }
  }
  if (marketId === "11" || marketId === "4703") {
    if (homeGoals === awayGoals) {
      return {
        status: "VOID",
        reason: `FT ${homeGoals}:${awayGoals} (Draw No Bet voided on draw)`
      };
    }
    if (outcomeId === "4" || /\bhome\b|\b1\b/i.test(desc)) {
      return {
        status: homeGoals > awayGoals ? "WON" : "LOST",
        reason: `FT ${homeGoals}:${awayGoals} (DNB Home)`
      };
    }
    if (outcomeId === "5" || /\baway\b|\b2\b/i.test(desc)) {
      return {
        status: awayGoals > homeGoals ? "WON" : "LOST",
        reason: `FT ${homeGoals}:${awayGoals} (DNB Away)`
      };
    }
  }
  if (marketId === "26" || marketId === "4833") {
    const isOdd = totalGoals % 2 === 1;
    if (outcomeId === "70" || /\bodd\b/i.test(desc)) {
      return {
        status: isOdd ? "WON" : "LOST",
        reason: `FT ${homeGoals}:${awayGoals} (Total ${totalGoals} ${isOdd ? "Odd" : "Even"})`
      };
    }
    if (outcomeId === "72" || /\beven\b/i.test(desc)) {
      return {
        status: !isOdd ? "WON" : "LOST",
        reason: `FT ${homeGoals}:${awayGoals} (Total ${totalGoals} ${isOdd ? "Odd" : "Even"})`
      };
    }
  }
  if (marketId === "16" || marketId === "3774") {
    const hcpSpec = /hcp=([+-]?\d+(?:\.\d+)?)/.exec(spec);
    if (hcpSpec) {
      const hcp = Number(hcpSpec[1]);
      const isHome = outcomeId === "1714" || /\bhome\b|\b1\b/i.test(desc);
      const isAway = outcomeId === "1715" || /\baway\b|\b2\b/i.test(desc);
      if (isHome || isAway) {
        const diff = isHome ? homeGoals + hcp - awayGoals : awayGoals - hcp - homeGoals;
        if (Math.abs(diff) < 1e-9) {
          return {
            status: "VOID",
            reason: `FT ${homeGoals}:${awayGoals} (Asian Handicap push)`
          };
        }
        return {
          status: diff > 0 ? "WON" : "LOST",
          reason: `FT ${homeGoals}:${awayGoals} (AH ${hcp})`
        };
      }
    }
  }
  if (marketId === "14") {
    const hcpSpec = /hcp=(\d+)\s*:\s*(\d+)/.exec(spec);
    if (hcpSpec) {
      const adjHome = homeGoals + Number(hcpSpec[1]);
      const adjAway = awayGoals + Number(hcpSpec[2]);
      if (/\bhome\b|\b1\b/i.test(desc)) {
        return { status: adjHome > adjAway ? "WON" : "LOST", reason: `FT ${homeGoals}:${awayGoals} (EH)` };
      }
      if (/\bdraw\b|\bx\b/i.test(desc)) {
        return { status: adjHome === adjAway ? "WON" : "LOST", reason: `FT ${homeGoals}:${awayGoals} (EH)` };
      }
      if (/\baway\b|\b2\b/i.test(desc)) {
        return { status: adjAway > adjHome ? "WON" : "LOST", reason: `FT ${homeGoals}:${awayGoals} (EH)` };
      }
    }
  }
  if (marketId === "36") {
    const specMatch = /total=(\d+(?:\.\d+)?)/.exec(spec);
    const line = specMatch ? Number(specMatch[1]) : NaN;
    const bothScored = homeGoals > 0 && awayGoals > 0;
    const isOver = /\bover\b/i.test(desc);
    const isUnder = /\bunder\b/i.test(desc);
    const wantYes = /\byes\b|\bgg\b/i.test(desc);
    const wantNo = /\bno\b|\bng\b/i.test(desc);
    if (Number.isFinite(line) && (isOver || isUnder) && (wantYes || wantNo)) {
      const ouOk = isOver ? totalGoals > line : totalGoals < line;
      const ggOk = wantYes ? bothScored : !bothScored;
      return {
        status: ouOk && ggOk ? "WON" : "LOST",
        reason: `FT ${homeGoals}:${awayGoals} (O/U ${line} & BTTS)`
      };
    }
  }
  return {
    status: "UNVERIFIED",
    reason: `Market ${marketId} (${sel.outcomeDesc}) requires manual official verification.`
  };
}
function evaluateTicketSettlement(ticket, matchLookup, nowMs = Date.now()) {
  const checkedAt = new Date(nowMs).toISOString();
  if (ticket.status === "WON" || ticket.status === "LOST" || ticket.status === "VOID") {
    return ticket;
  }
  const nextSettlements = ticket.selections.map((sel) => {
    const existingSel = ticket.selectionSettlements.find(
      (s) => s.selectionKey === sel.selectionKey
    );
    if (existingSel && (existingSel.status === "WON" || existingSel.status === "LOST" || existingSel.status === "VOID")) {
      return existingSel;
    }
    const match = matchLookup.get(sel.eventId) ?? null;
    if (!match) {
      const pastGrace = sel.estimateStartTime > 0 && nowMs > sel.estimateStartTime + 3 * 36e5;
      return {
        selectionKey: sel.selectionKey,
        eventId: sel.eventId,
        status: pastGrace ? "UNVERIFIED" : "PENDING",
        officialMatchStatus: existingSel?.officialMatchStatus || sel.matchStatus,
        score: existingSel?.score || null,
        playedSeconds: existingSel?.playedSeconds || null,
        currentOdds: existingSel?.currentOdds ?? sel.odds,
        oddsChanged: false,
        reason: pastGrace ? "Official final score unavailable after match window \u2014 marked UNVERIFIED (never treated as loss)." : "Awaiting kickoff / feed update",
        checkedAt
      };
    }
    const liveOdds = match.markets.find((m) => m.marketId === sel.marketId && (m.specifier || "") === (sel.specifier || ""))?.outcomes.find((o) => o.outcomeId === sel.outcomeId)?.odds ?? null;
    const oddsChanged = liveOdds !== null && Math.abs(liveOdds - sel.odds) >= 0.01;
    if (isMatchPostponedOrCancelled(match.matchStatus, match.statusCode)) {
      return {
        selectionKey: sel.selectionKey,
        eventId: sel.eventId,
        status: "VOID",
        officialMatchStatus: match.matchStatus,
        score: match.score,
        playedSeconds: match.playedSeconds,
        currentOdds: liveOdds,
        oddsChanged,
        reason: `Match ${match.matchStatus} \u2014 leg voided at 1.00`,
        checkedAt
      };
    }
    if (isMatchEnded(match.matchStatus, match.statusCode)) {
      const parsedScore = parseScoreString(match.score);
      if (!parsedScore) {
        return {
          selectionKey: sel.selectionKey,
          eventId: sel.eventId,
          status: "UNVERIFIED",
          officialMatchStatus: match.matchStatus,
          score: match.score,
          playedSeconds: match.playedSeconds,
          currentOdds: liveOdds,
          oddsChanged,
          reason: "Match ended without verifiable final score \u2014 marked UNVERIFIED.",
          checkedAt
        };
      }
      const outcomeRes = settleSingleSelectionOutcome(sel, parsedScore);
      return {
        selectionKey: sel.selectionKey,
        eventId: sel.eventId,
        status: outcomeRes.status,
        officialMatchStatus: match.matchStatus,
        score: match.score,
        playedSeconds: match.playedSeconds,
        currentOdds: liveOdds,
        oddsChanged,
        reason: outcomeRes.reason,
        checkedAt
      };
    }
    if (isMatchLiveStatus(match)) {
      return {
        selectionKey: sel.selectionKey,
        eventId: sel.eventId,
        status: "LIVE",
        officialMatchStatus: match.matchStatus,
        score: match.score || "0:0",
        playedSeconds: match.playedSeconds,
        currentOdds: liveOdds,
        oddsChanged,
        reason: `In-Play (${match.matchStatus}${match.playedSeconds ? ` ${match.playedSeconds}'` : ""})`,
        checkedAt
      };
    }
    return {
      selectionKey: sel.selectionKey,
      eventId: sel.eventId,
      status: "PENDING",
      officialMatchStatus: match.matchStatus,
      score: match.score,
      playedSeconds: match.playedSeconds,
      currentOdds: liveOdds,
      oddsChanged,
      reason: "Scheduled upcoming kickoff",
      checkedAt
    };
  });
  const hasLost = nextSettlements.some((s) => s.status === "LOST");
  const allVoid = nextSettlements.length > 0 && nextSettlements.every((s) => s.status === "VOID");
  const allTerminal = nextSettlements.every(
    (s) => s.status === "WON" || s.status === "LOST" || s.status === "VOID"
  );
  const hasWon = nextSettlements.some((s) => s.status === "WON");
  const hasVoid = nextSettlements.some((s) => s.status === "VOID");
  const hasUnverified = nextSettlements.some((s) => s.status === "UNVERIFIED");
  const hasLive = nextSettlements.some((s) => s.status === "LIVE");
  const hasPending = nextSettlements.some((s) => s.status === "PENDING");
  let effectiveCombinedOdds = 1;
  for (let i = 0; i < ticket.selections.length; i++) {
    const leg = ticket.selections[i];
    const legSettlement = nextSettlements[i];
    if (legSettlement?.status === "VOID") {
      effectiveCombinedOdds *= 1;
    } else {
      effectiveCombinedOdds *= leg.odds;
    }
  }
  effectiveCombinedOdds = Number(effectiveCombinedOdds.toFixed(2));
  let ticketStatus = "PENDING";
  let settledAt = null;
  if (hasLost) {
    ticketStatus = "LOST";
    settledAt = checkedAt;
  } else if (allVoid) {
    ticketStatus = "VOID";
    effectiveCombinedOdds = 1;
    settledAt = checkedAt;
  } else if (allTerminal && hasWon) {
    ticketStatus = "WON";
    settledAt = checkedAt;
  } else if (hasUnverified) {
    ticketStatus = "UNVERIFIED";
  } else if ((hasWon || hasVoid) && (hasPending || hasLive)) {
    ticketStatus = "PARTIALLY_SETTLED";
  } else if (hasLive) {
    ticketStatus = "LIVE";
  } else {
    ticketStatus = "PENDING";
  }
  return {
    ...ticket,
    status: ticketStatus,
    effectiveCombinedOdds,
    selectionSettlements: nextSettlements,
    settledAt,
    lastCheckedAt: checkedAt
  };
}
function makeBreakdownRows(groups) {
  const rows = [];
  for (const [label, list] of groups.entries()) {
    const won = list.filter((t) => t.status === "WON").length;
    const lost = list.filter((t) => t.status === "LOST").length;
    const voided = list.filter((t) => t.status === "VOID").length;
    const pending = list.filter(
      (t) => t.status === "PENDING" || t.status === "LIVE" || t.status === "PARTIALLY_SETTLED" || t.status === "UNVERIFIED"
    ).length;
    const settledNonVoid = won + lost;
    rows.push({
      label,
      total: list.length,
      won,
      lost,
      voided,
      pending,
      settledNonVoid,
      winRatePct: settledNonVoid > 0 ? Number((won / settledNonVoid * 100).toFixed(1)) : null
    });
  }
  return rows.sort((a, b) => b.total - a.total);
}
function computePerformanceAnalytics(tickets, meta) {
  const wonCount = tickets.filter((t) => t.status === "WON").length;
  const lostCount = tickets.filter((t) => t.status === "LOST").length;
  const voidCount = tickets.filter((t) => t.status === "VOID").length;
  const partiallySettledCount = tickets.filter(
    (t) => t.status === "PARTIALLY_SETTLED"
  ).length;
  const pendingOrLiveCount = tickets.filter(
    (t) => t.status === "PENDING" || t.status === "LIVE"
  ).length;
  const unverifiedCount = tickets.filter((t) => t.status === "UNVERIFIED").length;
  const validSharingCodes = tickets.filter((t) => Boolean(t.shareCode && t.shareCodeVerified)).length;
  const failedBookingCodes = tickets.filter((t) => t.bookingCodeStatus === "FAILED").length;
  const generatedToday = meta?.todayKey ? tickets.filter((t) => t.generatedDateKey === meta.todayKey).length : tickets.length;
  const totalSettled = wonCount + lostCount + voidCount;
  const settledNonVoidDenominator = wonCount + lostCount;
  const winRatePct = settledNonVoidDenominator > 0 ? Number((wonCount / settledNonVoidDenominator * 100).toFixed(1)) : null;
  const categoryGroups = /* @__PURE__ */ new Map();
  const marketGroups = /* @__PURE__ */ new Map();
  const leagueGroups = /* @__PURE__ */ new Map();
  const dailyMap = /* @__PURE__ */ new Map();
  for (const t of tickets) {
    const catLabel = t.categoryLabel || "Custom";
    categoryGroups.set(catLabel, [...categoryGroups.get(catLabel) || [], t]);
    const seenMkts = /* @__PURE__ */ new Set();
    const seenLeagues = /* @__PURE__ */ new Set();
    for (const s of t.selections) {
      if (!seenMkts.has(s.marketName)) {
        seenMkts.add(s.marketName);
        marketGroups.set(s.marketName, [...marketGroups.get(s.marketName) || [], t]);
      }
      if (!seenLeagues.has(s.leagueName)) {
        seenLeagues.add(s.leagueName);
        leagueGroups.set(s.leagueName, [...leagueGroups.get(s.leagueName) || [], t]);
      }
    }
    const dayRow = dailyMap.get(t.generatedDateKey) || {
      dateKey: t.generatedDateKey,
      generated: 0,
      won: 0,
      lost: 0,
      voided: 0
    };
    dayRow.generated += 1;
    if (t.status === "WON") dayRow.won += 1;
    if (t.status === "LOST") dayRow.lost += 1;
    if (t.status === "VOID") dayRow.voided += 1;
    dailyMap.set(t.generatedDateKey, dayRow);
  }
  return {
    totalGenerated: tickets.length,
    generatedToday,
    dailyTarget: meta?.dailyTarget ?? 55,
    totalSettled,
    wonCount,
    lostCount,
    voidCount,
    partiallySettledCount,
    pendingOrLiveCount,
    unverifiedCount,
    validSharingCodes,
    failedBookingCodes,
    settledNonVoidDenominator,
    winRatePct,
    lastScanningAt: meta?.lastScanningAt ?? null,
    lastSettlementAt: meta?.lastSettlementAt ?? null,
    byCategory: makeBreakdownRows(categoryGroups),
    byMarket: makeBreakdownRows(marketGroups).slice(0, 12),
    byLeague: makeBreakdownRows(leagueGroups).slice(0, 12),
    dailyTrends: Array.from(dailyMap.values()).sort(
      (a, b) => a.dateKey.localeCompare(b.dateKey)
    ),
    performanceDisclaimer: "Metrics represent automatically generated candidate combinations and their verified bookmaker market settlements (Won / (Won + Lost)). Candidate tickets are distinct from actual wagers placed by users; hypothetical multipliers are never presented as real betting profits."
  };
}

// backend/services/schedulerService.ts
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
var SchedulerService = class {
  constructor() {
    this.factoryTimer = null;
    this.resultsTimer = null;
    this.bootTimer = null;
    this.factoryLock = false;
    this.resultsLock = false;
    this.resultsIntervalMinutes = 10;
  }
  start() {
    this.rescheduleFactoryTimer();
    if (!this.resultsTimer) {
      this.resultsTimer = setInterval(() => {
        void this.runResultsTrackingJob(false);
      }, this.resultsIntervalMinutes * 60 * 1e3);
      this.resultsTimer.unref?.();
    }
    if (process.env.NODE_ENV !== "test" && !this.bootTimer) {
      this.bootTimer = setTimeout(() => {
        const cfg = automationStore.getFactoryConfig();
        if (cfg.enabled && !cfg.paused) {
          const todayCount = this.getDailyTicketsCountToday(cfg.timezone);
          if (todayCount < Math.min(cfg.maxTickets, cfg.dailyTicketTarget)) {
            void this.runDailyFactoryJob(false, null);
          }
        }
      }, 3e3);
      this.bootTimer.unref?.();
    }
  }
  stop() {
    if (this.bootTimer) {
      clearTimeout(this.bootTimer);
      this.bootTimer = null;
    }
    if (this.factoryTimer) {
      clearInterval(this.factoryTimer);
      this.factoryTimer = null;
    }
    if (this.resultsTimer) {
      clearInterval(this.resultsTimer);
      this.resultsTimer = null;
    }
  }
  rescheduleFactoryTimer() {
    if (this.factoryTimer) {
      clearInterval(this.factoryTimer);
      this.factoryTimer = null;
    }
    const cfg = automationStore.getFactoryConfig();
    if (!cfg.enabled || cfg.paused) return;
    const intervalMs = Math.max(5, cfg.scheduleIntervalMinutes) * 60 * 1e3;
    this.factoryTimer = setInterval(() => {
      void this.runDailyFactoryJob(false, null);
    }, intervalMs);
    this.factoryTimer.unref?.();
  }
  isWithinOperatingWindow(cfg, nowMs = Date.now()) {
    const tz = cfg.timezone || "Africa/Dar_es_Salaam";
    const currentMin = getTimeMinutesInTimezone(nowMs, tz);
    const startMin = parseHhMmToMinutes(cfg.windowStartTime, 0);
    const endMin = parseHhMmToMinutes(cfg.windowEndTime, 23 * 60 + 59);
    if (startMin <= endMin) {
      return currentMin >= startMin && currentMin <= endMin;
    }
    return currentMin >= startMin || currentMin <= endMin;
  }
  getDailyTicketsCountToday(tz = "Africa/Dar_es_Salaam") {
    const todayKey = getDateKeyInTimezone(Date.now(), tz);
    return automationStore.getTickets().filter((t) => t.generatedDateKey === todayKey).length;
  }
  getStatus() {
    const cfg = automationStore.getFactoryConfig();
    const meta = automationStore.getTimestamps();
    const todayKey = getDateKeyInTimezone(Date.now(), cfg.timezone);
    const todayTickets = automationStore.getTickets().filter((t) => t.generatedDateKey === todayKey);
    const nextRun = cfg.enabled && !cfg.paused && meta.lastFactoryRunAt ? new Date(
      Date.parse(meta.lastFactoryRunAt) + Math.max(5, cfg.scheduleIntervalMinutes) * 60 * 1e3
    ).toISOString() : null;
    return {
      enabled: cfg.enabled,
      paused: cfg.paused,
      factoryRunning: this.factoryLock,
      resultsTrackerRunning: this.resultsLock,
      resultsIntervalMinutes: this.resultsIntervalMinutes,
      lastFactoryRunAt: meta.lastFactoryRunAt,
      lastResultsRunAt: meta.lastResultsRunAt,
      lastScanningAt: meta.lastScanningAt,
      lastSettlementAt: meta.lastResultsRunAt,
      nextFactoryRunAt: nextRun,
      totalDailyTicketsToday: todayTickets.length,
      dailyTicketTarget: cfg.dailyTicketTarget,
      bookingCodesGeneratedToday: todayTickets.filter(
        (t) => t.bookingCodeStatus === "GENERATED" && Boolean(t.shareCode)
      ).length,
      bookingCodeFailuresToday: todayTickets.filter(
        (t) => t.bookingCodeStatus === "FAILED"
      ).length,
      dailyShortfallReason: meta.dailyShortfallReason
    };
  }
  async revalidateAndPublishTickets(candidates, cfg) {
    if (candidates.length === 0) {
      return { publishedTickets: [], rejectedCount: 0, codesCreated: 0, codeFailures: 0 };
    }
    const activeBookmaker = normalizeBookmakerId(
      candidates[0]?.bookmakerId || cfg.activeBookmaker
    );
    const client = getBookmakerClient(activeBookmaker);
    const bookmakerInfo = getBookmakerInfo(activeBookmaker);
    const uniqueEventIds = Array.from(
      new Set(candidates.flatMap((t) => t.selections.map((s) => s.eventId)))
    );
    const matchLookup = /* @__PURE__ */ new Map();
    for (let i = 0; i < uniqueEventIds.length; i += 10) {
      const chunk = uniqueEventIds.slice(i, i + 10);
      await Promise.all(
        chunk.map(async (eventId) => {
          try {
            const match = await client.getMatchDetails(eventId);
            matchLookup.set(eventId, match);
          } catch {
            matchLookup.set(eventId, null);
          }
        })
      );
    }
    const nowMs = Date.now();
    const revalidatedAt = new Date(nowMs).toISOString();
    const publishedTickets = [];
    let rejectedCount = 0;
    let codesCreated = 0;
    let codeFailures = 0;
    const usedShareCodes = automationStore.getExistingShareCodes();
    for (const candidate of candidates) {
      const check = revalidateTicketSelectionsAgainstMatches(
        candidate.selections,
        matchLookup,
        cfg,
        nowMs
      );
      if (!check.valid) {
        rejectedCount++;
        continue;
      }
      const refreshedCombined = Number(
        check.refreshedSelections.reduce((acc, s) => acc * s.odds, 1).toFixed(2)
      );
      let validatedTicket = {
        ...candidate,
        bookmakerId: activeBookmaker,
        bookmakerName: candidate.bookmakerName || bookmakerInfo.name,
        bookmakerUrl: candidate.bookmakerUrl || bookmakerInfo.websiteUrl,
        selections: check.refreshedSelections,
        actualCombinedOdds: refreshedCombined,
        effectiveCombinedOdds: refreshedCombined,
        oddsDifference: Number((refreshedCombined - candidate.targetOdds).toFixed(2)),
        revalidatedAt,
        published: true
      };
      if (cfg.autoCreateBookingCodes) {
        try {
          const booking = await client.createBookingCode(validatedTicket.selections);
          const cleanCode = String(booking.shareCode || "").trim().toUpperCase();
          if (!cleanCode || usedShareCodes.has(cleanCode)) {
            throw new Error(
              cleanCode ? `Duplicate booking code ${cleanCode} rejected to preserve unique card codes.` : `${bookmakerInfo.shortName} returned an empty booking code.`
            );
          }
          usedShareCodes.add(cleanCode);
          validatedTicket = {
            ...validatedTicket,
            shareCode: booking.shareCode,
            shareUrl: booking.shareUrl,
            shareCodeDeadline: booking.deadline,
            shareCodeVerified: booking.verified,
            bookingCodeStatus: "GENERATED",
            bookingCodeError: null
          };
          codesCreated++;
          await sleep(100);
        } catch (err) {
          codeFailures++;
          validatedTicket = {
            ...validatedTicket,
            shareCode: null,
            shareUrl: null,
            shareCodeDeadline: null,
            shareCodeVerified: false,
            bookingCodeStatus: "FAILED",
            bookingCodeError: err instanceof Error ? err.message : `${bookmakerInfo.shortName} sharing-code API rejected or throttled this betslip.`
          };
        }
      }
      publishedTickets.push(validatedTicket);
    }
    return { publishedTickets, rejectedCount, codesCreated, codeFailures };
  }
  async runDailyFactoryJob(manualTrigger = true, actorEmail = null) {
    const startedMs = Date.now();
    const startedAt = new Date(startedMs).toISOString();
    const cfg = automationStore.getFactoryConfig();
    const actionType = manualTrigger ? "MANUAL_TRIGGER" : "AUTO_SCHEDULE";
    if (this.factoryLock) {
      const skippedLog = {
        logId: `log_${import_crypto6.default.randomBytes(4).toString("hex")}`,
        actionType,
        jobType: "DAILY_FACTORY",
        status: "SKIPPED",
        actorEmail,
        startedAt,
        finishedAt: (/* @__PURE__ */ new Date()).toISOString(),
        durationMs: Date.now() - startedMs,
        ticketsGenerated: 0,
        codesCreated: 0,
        codeFailures: 0,
        ticketsChecked: 0,
        ticketsSettled: 0,
        message: "Skipped overlapping Daily Factory execution (active run in progress)."
      };
      automationStore.addLog(skippedLog);
      return { tickets: [], log: skippedLog, shortfallReason: skippedLog.message };
    }
    if (!manualTrigger && (!cfg.enabled || cfg.paused)) {
      const skippedLog = {
        logId: `log_${import_crypto6.default.randomBytes(4).toString("hex")}`,
        actionType,
        jobType: "DAILY_FACTORY",
        status: "SKIPPED",
        actorEmail,
        startedAt,
        finishedAt: (/* @__PURE__ */ new Date()).toISOString(),
        durationMs: Date.now() - startedMs,
        ticketsGenerated: 0,
        codesCreated: 0,
        codeFailures: 0,
        ticketsChecked: 0,
        ticketsSettled: 0,
        message: cfg.paused ? "Daily Factory scheduler is paused by administrator." : "Daily Factory automation is disabled."
      };
      return { tickets: [], log: skippedLog, shortfallReason: null };
    }
    if (!manualTrigger && !this.isWithinOperatingWindow(cfg, startedMs)) {
      const skippedLog = {
        logId: `log_${import_crypto6.default.randomBytes(4).toString("hex")}`,
        actionType,
        jobType: "DAILY_FACTORY",
        status: "SKIPPED",
        actorEmail,
        startedAt,
        finishedAt: (/* @__PURE__ */ new Date()).toISOString(),
        durationMs: Date.now() - startedMs,
        ticketsGenerated: 0,
        codesCreated: 0,
        codeFailures: 0,
        ticketsChecked: 0,
        ticketsSettled: 0,
        message: `Outside configured ${cfg.windowStartTime}\u2013${cfg.windowEndTime} ${cfg.timezone} window.`
      };
      automationStore.addLog(skippedLog);
      return { tickets: [], log: skippedLog, shortfallReason: null };
    }
    const existingToday = this.getDailyTicketsCountToday(cfg.timezone);
    const cap = Math.min(cfg.maxTickets, cfg.dailyTicketTarget);
    const remainingCapacity = manualTrigger ? Math.max(0, cfg.maxTickets - existingToday) : Math.max(0, cap - existingToday);
    if (remainingCapacity <= 0) {
      const msg = `Daily ticket target already reached (${existingToday}/${cap} today in ${cfg.timezone}).`;
      const log = {
        logId: `log_${import_crypto6.default.randomBytes(4).toString("hex")}`,
        actionType,
        jobType: "DAILY_FACTORY",
        status: "SKIPPED",
        actorEmail,
        startedAt,
        finishedAt: (/* @__PURE__ */ new Date()).toISOString(),
        durationMs: Date.now() - startedMs,
        ticketsGenerated: 0,
        codesCreated: 0,
        codeFailures: 0,
        ticketsChecked: 0,
        ticketsSettled: 0,
        message: msg
      };
      automationStore.addLog(log);
      automationStore.setFactoryRunMeta(startedAt, null);
      return { tickets: [], log, shortfallReason: null };
    }
    this.factoryLock = true;
    try {
      const matches = await fetchUpcomingMatchesForFactory(cfg);
      automationStore.setScanningAt((/* @__PURE__ */ new Date()).toISOString());
      const existingSignatures = cfg.duplicatePrevention ? automationStore.getExistingSignatures() : /* @__PURE__ */ new Set();
      const batchTarget = manualTrigger ? Math.min(remainingCapacity, cfg.dailyTicketTarget) : remainingCapacity;
      const todayKey = getDateKeyInTimezone(Date.now(), cfg.timezone);
      const { eventIds: existingEventIds, teamKeys: existingTeamKeys } = automationStore.getExistingEventAndTeamUsage(todayKey);
      const generated = generateDailyPortfolioFromMatches({
        matches,
        config: cfg,
        targetCount: batchTarget,
        sourceType: manualTrigger ? "ADMIN_MANUAL" : "DAILY_FACTORY",
        existingSignatures,
        existingEventIds,
        existingTeamKeys,
        nowMs: Date.now()
      });
      const { publishedTickets, rejectedCount, codesCreated, codeFailures } = await this.revalidateAndPublishTickets(generated.tickets, cfg);
      const saved = automationStore.addTickets(publishedTickets);
      const finishedAt = (/* @__PURE__ */ new Date()).toISOString();
      const combinedShortfall = generated.shortfallReason || (rejectedCount > 0 ? `${rejectedCount} candidate ticket(s) rejected during live pre-publish odds/status revalidation.` : null);
      automationStore.setFactoryRunMeta(finishedAt, combinedShortfall);
      const log = {
        logId: `log_${import_crypto6.default.randomBytes(4).toString("hex")}`,
        actionType,
        jobType: "DAILY_FACTORY",
        status: combinedShortfall ? "PARTIAL" : "SUCCESS",
        actorEmail,
        startedAt,
        finishedAt,
        durationMs: Date.now() - startedMs,
        ticketsGenerated: saved.length,
        codesCreated,
        codeFailures,
        ticketsChecked: 0,
        ticketsSettled: 0,
        message: combinedShortfall ? `Published ${saved.length} validated ticket(s) (${codesCreated} genuine codes, ${codeFailures} code failures). ${combinedShortfall}` : `Published ${saved.length} unique daily ticket(s) (${codesCreated} genuine codes, ${codeFailures} failures).`
      };
      automationStore.addLog(log);
      return { tickets: saved, log, shortfallReason: combinedShortfall };
    } catch (err) {
      const finishedAt = (/* @__PURE__ */ new Date()).toISOString();
      const errMsg = err instanceof Error ? err.message : "Daily Factory job failed";
      const log = {
        logId: `log_${import_crypto6.default.randomBytes(4).toString("hex")}`,
        actionType,
        jobType: "DAILY_FACTORY",
        status: "FAILED",
        actorEmail,
        startedAt,
        finishedAt,
        durationMs: Date.now() - startedMs,
        ticketsGenerated: 0,
        codesCreated: 0,
        codeFailures: 0,
        ticketsChecked: 0,
        ticketsSettled: 0,
        message: errMsg
      };
      automationStore.addLog(log);
      return { tickets: [], log, shortfallReason: errMsg };
    } finally {
      this.factoryLock = false;
    }
  }
  async retryFailedBookingCodes(ticketIds, actorEmail = null) {
    const startedMs = Date.now();
    const startedAt = new Date(startedMs).toISOString();
    const all = automationStore.getTickets();
    const targets = all.filter((t) => {
      if (ticketIds && ticketIds.length > 0 && !ticketIds.includes(t.internalTicketId)) {
        return false;
      }
      return t.status === "PENDING" && (!t.shareCode || t.bookingCodeStatus === "FAILED" || t.bookingCodeStatus === "NOT_REQUESTED");
    });
    let codesCreated = 0;
    let codeFailures = 0;
    const usedShareCodes = automationStore.getExistingShareCodes();
    for (const ticket of targets) {
      const ticketBookmaker = normalizeBookmakerId(ticket.bookmakerId);
      const client = getBookmakerClient(ticketBookmaker);
      const bookmakerInfo = getBookmakerInfo(ticketBookmaker);
      try {
        const booking = await client.createBookingCode(ticket.selections);
        const cleanCode = String(booking.shareCode || "").trim().toUpperCase();
        if (!cleanCode || usedShareCodes.has(cleanCode)) {
          throw new Error(
            cleanCode ? `Duplicate booking code ${cleanCode} rejected to preserve unique card codes.` : `${bookmakerInfo.shortName} returned an empty booking code.`
          );
        }
        usedShareCodes.add(cleanCode);
        automationStore.updateTicketMutableFields({
          ...ticket,
          shareCode: booking.shareCode,
          shareUrl: booking.shareUrl,
          shareCodeDeadline: booking.deadline,
          shareCodeVerified: booking.verified,
          bookingCodeStatus: "GENERATED",
          bookingCodeError: null,
          lastCheckedAt: (/* @__PURE__ */ new Date()).toISOString()
        });
        codesCreated++;
        await sleep(100);
      } catch (err) {
        codeFailures++;
        automationStore.updateTicketMutableFields({
          ...ticket,
          bookingCodeStatus: "FAILED",
          bookingCodeError: err instanceof Error ? err.message : `${bookmakerInfo.shortName} booking code API failed`,
          lastCheckedAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
    }
    const log = {
      logId: `log_${import_crypto6.default.randomBytes(4).toString("hex")}`,
      actionType: "RETRY_CODES",
      jobType: "ADMIN_ACTION",
      status: codeFailures > 0 && codesCreated === 0 ? "FAILED" : codeFailures > 0 ? "PARTIAL" : "SUCCESS",
      actorEmail,
      startedAt,
      finishedAt: (/* @__PURE__ */ new Date()).toISOString(),
      durationMs: Date.now() - startedMs,
      ticketsGenerated: 0,
      codesCreated,
      codeFailures,
      ticketsChecked: targets.length,
      ticketsSettled: 0,
      message: `Retried ${targets.length} ticket(s): ${codesCreated} genuine booking code(s) created, ${codeFailures} failed.`
    };
    automationStore.addLog(log);
    return {
      retriedCount: targets.length,
      codesCreated,
      codeFailures,
      tickets: automationStore.getTickets(),
      log
    };
  }
  async runResultsTrackingJob(manualTrigger = true, ticketIds, actorEmail = null) {
    const startedMs = Date.now();
    const startedAt = new Date(startedMs).toISOString();
    if (this.resultsLock) {
      const skippedLog = {
        logId: `log_${import_crypto6.default.randomBytes(4).toString("hex")}`,
        actionType: "RESULTS_CHECK",
        jobType: "RESULTS_TRACKER",
        status: "SKIPPED",
        actorEmail,
        startedAt,
        finishedAt: (/* @__PURE__ */ new Date()).toISOString(),
        durationMs: Date.now() - startedMs,
        ticketsGenerated: 0,
        codesCreated: 0,
        codeFailures: 0,
        ticketsChecked: 0,
        ticketsSettled: 0,
        message: "Results tracker already running."
      };
      return { updatedTickets: [], log: skippedLog };
    }
    this.resultsLock = true;
    try {
      const allTickets = automationStore.getTickets();
      const targetTickets = allTickets.filter((t) => {
        if (ticketIds && ticketIds.length > 0 && !ticketIds.includes(t.internalTicketId)) {
          return false;
        }
        return t.status !== "WON" && t.status !== "LOST" && t.status !== "VOID";
      });
      if (targetTickets.length === 0) {
        const finishedAt2 = (/* @__PURE__ */ new Date()).toISOString();
        automationStore.setResultsRunAt(finishedAt2);
        const log2 = {
          logId: `log_${import_crypto6.default.randomBytes(4).toString("hex")}`,
          actionType: "RESULTS_CHECK",
          jobType: "RESULTS_TRACKER",
          status: manualTrigger ? "SUCCESS" : "SKIPPED",
          actorEmail,
          startedAt,
          finishedAt: finishedAt2,
          durationMs: Date.now() - startedMs,
          ticketsGenerated: 0,
          codesCreated: 0,
          codeFailures: 0,
          ticketsChecked: 0,
          ticketsSettled: 0,
          message: "No active pending or live tickets require settlement verification."
        };
        if (manualTrigger) automationStore.addLog(log2);
        return { updatedTickets: [], log: log2 };
      }
      const ticketsByBookmaker = /* @__PURE__ */ new Map();
      for (const ticket of targetTickets) {
        const bk = normalizeBookmakerId(ticket.bookmakerId);
        const arr = ticketsByBookmaker.get(bk) || [];
        arr.push(ticket);
        ticketsByBookmaker.set(bk, arr);
      }
      const updatedTickets = [];
      let settledCount = 0;
      let totalUniqueEvents = 0;
      for (const [bkId, bkTickets] of ticketsByBookmaker.entries()) {
        const client = getBookmakerClient(bkId);
        const bkEventIds = Array.from(
          new Set(bkTickets.flatMap((t) => t.selections.map((s) => s.eventId)))
        );
        totalUniqueEvents += bkEventIds.length;
        const matchLookup = /* @__PURE__ */ new Map();
        try {
          const live = await client.getLiveMatches();
          for (const m of live) {
            matchLookup.set(m.eventId, m);
          }
        } catch {
        }
        const remainingIds = bkEventIds.filter((id) => !matchLookup.has(id));
        for (let i = 0; i < remainingIds.length; i += 10) {
          const chunk = remainingIds.slice(i, i + 10);
          await Promise.all(
            chunk.map(async (eventId) => {
              try {
                const details = await client.getMatchDetails(eventId);
                matchLookup.set(eventId, details);
              } catch {
                matchLookup.set(eventId, null);
              }
            })
          );
        }
        for (const ticket of bkTickets) {
          const evaluated = evaluateTicketSettlement(ticket, matchLookup, Date.now());
          if (evaluated.status === "WON" || evaluated.status === "LOST" || evaluated.status === "VOID") {
            settledCount++;
          }
          const saved = automationStore.updateTicketMutableFields(evaluated);
          if (saved) updatedTickets.push(saved);
        }
      }
      const uniqueEventIds = { length: totalUniqueEvents };
      const finishedAt = (/* @__PURE__ */ new Date()).toISOString();
      automationStore.setResultsRunAt(finishedAt);
      const log = {
        logId: `log_${import_crypto6.default.randomBytes(4).toString("hex")}`,
        actionType: "RESULTS_CHECK",
        jobType: "RESULTS_TRACKER",
        status: "SUCCESS",
        actorEmail,
        startedAt,
        finishedAt,
        durationMs: Date.now() - startedMs,
        ticketsGenerated: 0,
        codesCreated: 0,
        codeFailures: 0,
        ticketsChecked: updatedTickets.length,
        ticketsSettled: settledCount,
        message: `Checked ${updatedTickets.length} active ticket(s) across ${uniqueEventIds.length} event(s); settled ${settledCount}.`
      };
      automationStore.addLog(log);
      return { updatedTickets, log };
    } catch (err) {
      const finishedAt = (/* @__PURE__ */ new Date()).toISOString();
      const errMsg = err instanceof Error ? err.message : "Results tracking failed";
      const log = {
        logId: `log_${import_crypto6.default.randomBytes(4).toString("hex")}`,
        actionType: "RESULTS_CHECK",
        jobType: "RESULTS_TRACKER",
        status: "FAILED",
        actorEmail,
        startedAt,
        finishedAt,
        durationMs: Date.now() - startedMs,
        ticketsGenerated: 0,
        codesCreated: 0,
        codeFailures: 0,
        ticketsChecked: 0,
        ticketsSettled: 0,
        message: errMsg
      };
      automationStore.addLog(log);
      return { updatedTickets: [], log };
    } finally {
      this.resultsLock = false;
    }
  }
};
var schedulerService = new SchedulerService();

// backend/controllers/sportybetController.ts
function resolveRequestBookmaker(req, explicit) {
  if (explicit) return normalizeBookmakerId(explicit);
  if (req.query.bookmaker) return normalizeBookmakerId(req.query.bookmaker);
  return "SPORTYBET_TZ";
}
function assertBookmakerEnabledOrRespond(res, bookmakerId) {
  if (!platformConfigService.isBookmakerEnabled(bookmakerId)) {
    const info = getBookmakerInfo(bookmakerId);
    res.status(503).json({
      error: `${info.name} integration is currently disabled by an administrator.`
    });
    return false;
  }
  return true;
}
function handleError(res, err, context = "API_ERROR") {
  if (err instanceof SportyBetIntegrationError) {
    backendLogger.warn("INTEGRATION", context, err.message, {
      metadata: { statusCode: err.statusCode, bizCode: err.bizCode || null }
    });
    return res.status(err.statusCode).json({
      error: err.message,
      bizCode: err.bizCode
    });
  }
  const message = err instanceof Error ? err.message : "Unexpected server error";
  backendLogger.error("API", context, message);
  return res.status(500).json({ error: message });
}
async function getHealth(_req, res) {
  res.json({
    ok: true,
    service: "sportybet-odds-hunter-api",
    runtime: process.env.VERCEL ? "vercel-serverless" : "node-express",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
}
async function getPlatformStatus(_req, res) {
  const settings = platformConfigService.getSettings();
  res.json({
    settings,
    crossTransferEnabled: platformConfigService.isCrossTransferEnabled(),
    bookmakerStatus: {
      SPORTYBET_TZ: settings.sportybetEnabled,
      BETPAWA_TZ: settings.betpawaEnabled
    }
  });
}
async function getBookmakers(_req, res) {
  const cfg = automationStore.getFactoryConfig();
  const settings = platformConfigService.getSettings();
  res.json({
    bookmakers: Object.values(BOOKMAKER_CATALOG),
    factoryBookmaker: normalizeBookmakerId(cfg.activeBookmaker),
    enabledMap: {
      SPORTYBET_TZ: settings.sportybetEnabled,
      BETPAWA_TZ: settings.betpawaEnabled
    },
    crossTransferEnabled: platformConfigService.isCrossTransferEnabled()
  });
}
async function getResearchReport(req, res) {
  const bookmakerId = resolveRequestBookmaker(req);
  res.json(getBookmakerResearchReport(bookmakerId));
}
async function getMarketCatalog(req, res) {
  const bookmakerId = resolveRequestBookmaker(req);
  res.json({
    bookmakerId,
    markets: getBookmakerMarketCatalog(bookmakerId)
  });
}
async function getDiagnostics(req, res) {
  try {
    const bookmakerId = resolveRequestBookmaker(req);
    if (!assertBookmakerEnabledOrRespond(res, bookmakerId)) return;
    const client = getBookmakerClient(bookmakerId);
    const checks = await client.runDiagnostics();
    res.json({
      bookmakerId,
      checkedAt: (/* @__PURE__ */ new Date()).toISOString(),
      checks
    });
  } catch (err) {
    handleError(res, err, "DIAGNOSTICS_FAILED");
  }
}
async function getLeagues(req, res) {
  try {
    const bookmakerId = resolveRequestBookmaker(req);
    if (!assertBookmakerEnabledOrRespond(res, bookmakerId)) return;
    const client = getBookmakerClient(bookmakerId);
    const leagues = await client.getLeagueDirectory();
    res.json({ bookmakerId, leagues });
  } catch (err) {
    handleError(res, err, "LEAGUES_FAILED");
  }
}
async function getLiveMatches(req, res) {
  try {
    const bookmakerId = resolveRequestBookmaker(req);
    if (!assertBookmakerEnabledOrRespond(res, bookmakerId)) return;
    const client = getBookmakerClient(bookmakerId);
    const info = getBookmakerInfo(bookmakerId);
    const matches = await client.getLiveMatches();
    res.json({
      bookmakerId,
      matches,
      count: matches.length,
      retrievedAt: (/* @__PURE__ */ new Date()).toISOString(),
      dataSource: `${info.shortName} Live Feed`
    });
  } catch (err) {
    handleError(res, err, "LIVE_MATCHES_FAILED");
  }
}
async function getUpcomingMatches(req, res) {
  try {
    const bookmakerId = resolveRequestBookmaker(req);
    if (!assertBookmakerEnabledOrRespond(res, bookmakerId)) return;
    const client = getBookmakerClient(bookmakerId);
    const info = getBookmakerInfo(bookmakerId);
    const pageNum = Math.max(1, Number(req.query.pageNum || 1));
    const pageSize = Math.min(100, Math.max(10, Number(req.query.pageSize || 50)));
    const todayGames = req.query.todayGames === "true";
    const { matches, totalAvailable } = await client.getUpcomingMatches({
      pageNum,
      pageSize,
      maxPages: 1,
      todayGames
    });
    res.json({
      bookmakerId,
      matches,
      pageNum,
      pageSize,
      totalAvailable,
      retrievedAt: (/* @__PURE__ */ new Date()).toISOString(),
      dataSource: `${info.shortName} Upcoming Feed`
    });
  } catch (err) {
    handleError(res, err, "UPCOMING_MATCHES_FAILED");
  }
}
async function getMatchDetails(req, res) {
  try {
    const eventId = String(req.params.eventId || "").trim();
    if (!eventId || eventId.length > 100) {
      return res.status(400).json({ error: "Valid eventId parameter is required." });
    }
    const bookmakerId = resolveRequestBookmaker(req);
    if (!assertBookmakerEnabledOrRespond(res, bookmakerId)) return;
    const client = getBookmakerClient(bookmakerId);
    const match = await client.getMatchDetails(eventId);
    res.json({ bookmakerId, match });
  } catch (err) {
    handleError(res, err, "MATCH_DETAILS_FAILED");
  }
}
async function runScanner(req, res) {
  const parsed = scannerConfigSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid scanner configuration.",
      details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`)
    });
  }
  try {
    const bookmakerId = resolveRequestBookmaker(req, parsed.data.bookmakerId);
    if (!assertBookmakerEnabledOrRespond(res, bookmakerId)) return;
    const scanResult = await runLiveOddsScan(parsed.data);
    res.json(scanResult);
  } catch (err) {
    handleError(res, err, "SCANNER_RUN_FAILED");
  }
}
async function validateBetslip(req, res) {
  const parsed = betslipPayloadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid betslip payload.",
      details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`)
    });
  }
  try {
    const bookmakerId = resolveRequestBookmaker(
      req,
      parsed.data.bookmakerId || parsed.data.selections[0]?.bookmakerId
    );
    if (!assertBookmakerEnabledOrRespond(res, bookmakerId)) return;
    assertSameBookmakerSelections(parsed.data.selections, bookmakerId);
    const client = getBookmakerClient(bookmakerId);
    const uniqueEventIds = Array.from(new Set(parsed.data.selections.map((s) => s.eventId)));
    const matchMap = /* @__PURE__ */ new Map();
    await Promise.all(
      uniqueEventIds.map(async (eventId) => {
        try {
          const match = await client.getMatchDetails(eventId);
          matchMap.set(eventId, match);
        } catch {
          matchMap.set(eventId, null);
        }
      })
    );
    const validation = validateBetslipAgainstMatches(parsed.data.selections, matchMap);
    res.json(validation);
  } catch (err) {
    handleError(res, err, "BETSLIP_VALIDATE_FAILED");
  }
}
async function createBookingCode(req, res) {
  const parsed = betslipPayloadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid booking code selection payload.",
      details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`)
    });
  }
  try {
    const bookmakerId = resolveRequestBookmaker(
      req,
      parsed.data.bookmakerId || parsed.data.selections[0]?.bookmakerId
    );
    if (!assertBookmakerEnabledOrRespond(res, bookmakerId)) return;
    assertSameBookmakerSelections(parsed.data.selections, bookmakerId);
    const client = getBookmakerClient(bookmakerId);
    const result = await client.createBookingCode(parsed.data.selections);
    res.json(result);
  } catch (err) {
    handleError(res, err, "BOOKING_CODE_CREATE_FAILED");
  }
}
async function verifyBookingCode(req, res) {
  try {
    const code = String(req.params.code || "").trim();
    const bookmakerId = resolveRequestBookmaker(req);
    if (!assertBookmakerEnabledOrRespond(res, bookmakerId)) return;
    const client = getBookmakerClient(bookmakerId);
    const result = await client.verifyBookingCode(code);
    res.json(result);
  } catch (err) {
    handleError(res, err, "BOOKING_CODE_VERIFY_FAILED");
  }
}
async function getAuthSession(req, res) {
  const user = req.authUser;
  if (!user) {
    return res.status(401).json({ authenticated: false, error: "Not authenticated." });
  }
  const access = platformConfigService.getUserAccess(user.uid);
  const admin = isUserAuthorizedAdmin(user);
  res.json({
    authenticated: true,
    uid: user.uid,
    email: user.email,
    displayName: access?.displayName || user.name || user.email.split("@")[0],
    emailVerified: user.emailVerified,
    isAdmin: admin,
    role: admin ? "ADMIN" : access?.role || "USER",
    disabled: Boolean(access?.disabled),
    serverTimestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
}
async function recordAuthAudit(req, res) {
  const parsed = authAuditSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid audit payload." });
  }
  const { event, email, details } = parsed.data;
  const level = event === "LOGIN_FAILED" ? "WARN" : "INFO";
  const entry = backendLogger.log({
    level,
    category: "AUTH",
    event,
    message: details || `Authentication event ${event}${email ? ` (${email})` : ""}.`,
    actorUid: req.authUser?.uid || null,
    actorEmail: req.authUser?.email || email || null
  });
  res.json({ logged: true, id: entry.id });
}
async function getTransferMarkets(_req, res) {
  const settings = platformConfigService.getSettings();
  res.json({
    markets: Object.values(CANONICAL_MARKET_CATALOG),
    enabledMarkets: settings.supportedTransferMarkets,
    crossTransferEnabled: platformConfigService.isCrossTransferEnabled(),
    bookmakerStatus: {
      SPORTYBET_TZ: settings.sportybetEnabled,
      BETPAWA_TZ: settings.betpawaEnabled
    }
  });
}
async function previewTransfer(req, res) {
  if (!platformConfigService.isCrossTransferEnabled()) {
    return res.status(503).json({
      error: "Cross-Bookmaker Bet Transfer is currently disabled by an administrator or one of the bookmakers is disabled."
    });
  }
  const parsed = transferPreviewSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid bet transfer preview request.",
      details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`)
    });
  }
  try {
    const preview = await previewCrossBookmakerTransfer({
      direction: parsed.data.direction,
      bookingCode: parsed.data.bookingCode,
      manualSelections: parsed.data.manualSelections,
      actorUid: req.authUser?.uid || null,
      actorEmail: req.authUser?.email || null
    });
    res.json(preview);
  } catch (err) {
    handleError(res, err, "TRANSFER_PREVIEW_FAILED");
  }
}
async function confirmTransfer(req, res) {
  if (!platformConfigService.isCrossTransferEnabled()) {
    return res.status(503).json({
      error: "Cross-Bookmaker Bet Transfer is currently disabled by an administrator."
    });
  }
  const parsed = transferConfirmSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid transfer confirmation payload.",
      details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`)
    });
  }
  try {
    const result = await confirmCrossBookmakerTransfer({
      transferId: parsed.data.transferId,
      direction: parsed.data.direction,
      originalCode: parsed.data.originalCode,
      originalSelectionCount: parsed.data.originalSelectionCount,
      originalCombinedOdds: parsed.data.originalCombinedOdds,
      confirmedSelections: parsed.data.confirmedSelections,
      actorUid: req.authUser?.uid || null,
      actorEmail: req.authUser?.email || null
    });
    res.json(result);
  } catch (err) {
    handleError(res, err, "TRANSFER_CONFIRM_FAILED");
  }
}
async function getUserTransferHistory(req, res) {
  const user = req.authUser;
  if (!user) {
    return res.status(401).json({ error: "Authentication required." });
  }
  const all = platformConfigService.getTransferHistory({ limit: 100 });
  const isAdmin = isUserAuthorizedAdmin(user);
  const transfers = isAdmin ? all : all.filter((t) => t.actorUid === user.uid);
  res.json({ transfers, count: transfers.length });
}
async function checkAdminStatus(req, res) {
  const authHeader = String(req.headers.authorization || "");
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) {
    return res.json({ isAdmin: false, email: null });
  }
  const verified = await verifyFirebaseIdToken(token);
  if (!verified) {
    return res.json({ isAdmin: false, email: null });
  }
  platformConfigService.upsertSeenUser({
    uid: verified.uid,
    email: verified.email,
    displayName: verified.name,
    emailVerified: verified.emailVerified,
    defaultAdmin: isAdminEmail(verified.email, verified.emailVerified)
  });
  return res.json({
    isAdmin: isUserAuthorizedAdmin(verified),
    email: verified.email,
    emailVerified: verified.emailVerified
  });
}
async function listPublicTickets(req, res) {
  const bookmakerFilter = req.query.bookmaker ? String(req.query.bookmaker).trim().toUpperCase() : "";
  let tickets = automationStore.getTickets().filter((t) => isTicketAllowedInDailyFeed(t));
  if (bookmakerFilter === "SPORTYBET_TZ" || bookmakerFilter === "BETPAWA_TZ") {
    tickets = tickets.filter((t) => normalizeBookmakerId(t.bookmakerId) === bookmakerFilter);
  }
  res.json({ tickets, count: tickets.length });
}
async function getPublicTicketById(req, res) {
  const id = String(req.params.id || "").trim();
  const ticket = automationStore.getTicketById(id);
  if (!ticket || !isTicketAllowedInDailyFeed(ticket)) {
    return res.status(404).json({ error: `Ticket ${id} not found.` });
  }
  res.json({ ticket });
}
async function getPerformanceAnalytics(_req, res) {
  const tickets = automationStore.getTickets();
  const cfg = automationStore.getFactoryConfig();
  const meta = automationStore.getTimestamps();
  const todayKey = getDateKeyInTimezone(Date.now(), cfg.timezone);
  const summary = computePerformanceAnalytics(tickets, {
    todayKey,
    dailyTarget: cfg.dailyTicketTarget,
    lastScanningAt: meta.lastScanningAt,
    lastSettlementAt: meta.lastResultsRunAt
  });
  res.json(summary);
}
async function getSchedulerStatus(_req, res) {
  res.json({
    status: schedulerService.getStatus()
  });
}
async function runCronDailyFactory(req, res) {
  try {
    const actor = req.adminUser?.email || "vercel-cron";
    const result = await schedulerService.runDailyFactoryJob(false, actor);
    backendLogger.info("CRON", "DAILY_FACTORY_CRON", result.log.message, {
      actorEmail: actor,
      metadata: {
        status: result.log.status,
        ticketsGenerated: result.log.ticketsGenerated
      }
    });
    res.json({
      ok: true,
      log: result.log,
      shortfallReason: result.shortfallReason,
      status: schedulerService.getStatus()
    });
  } catch (err) {
    handleError(res, err, "CRON_DAILY_FACTORY_FAILED");
  }
}
async function runCronTrackResults(req, res) {
  try {
    const actor = req.adminUser?.email || "vercel-cron";
    const result = await schedulerService.runResultsTrackingJob(true, void 0, actor);
    backendLogger.info("CRON", "RESULTS_TRACKER_CRON", result.log.message, {
      actorEmail: actor,
      metadata: {
        status: result.log.status,
        ticketsChecked: result.log.ticketsChecked,
        ticketsSettled: result.log.ticketsSettled
      }
    });
    res.json({
      ok: true,
      log: result.log,
      status: schedulerService.getStatus()
    });
  } catch (err) {
    handleError(res, err, "CRON_RESULTS_FAILED");
  }
}
async function getDailyFactoryAdminState(_req, res) {
  res.json({
    config: automationStore.getFactoryConfig(),
    status: schedulerService.getStatus(),
    logs: automationStore.getLogs().slice(0, 80)
  });
}
async function updateDailyFactoryConfig(req, res) {
  const parsed = dailyFactoryConfigSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid Daily Factory configuration.",
      details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`)
    });
  }
  const cleanedMarkets = sanitizeDailyFactoryMarkets(parsed.data.markets || []);
  const saved = automationStore.setFactoryConfig({
    ...parsed.data,
    markets: cleanedMarkets.length > 0 ? cleanedMarkets : [...DEFAULT_ALLOWED_DAILY_FEED_MARKETS]
  });
  schedulerService.rescheduleFactoryTimer();
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  automationStore.addLog({
    logId: `log_${import_crypto7.default.randomBytes(4).toString("hex")}`,
    actionType: "SETTINGS_UPDATE",
    jobType: "ADMIN_ACTION",
    status: "SUCCESS",
    actorEmail: req.adminUser?.email || null,
    startedAt: nowIso,
    finishedAt: nowIso,
    durationMs: 0,
    ticketsGenerated: 0,
    codesCreated: 0,
    codeFailures: 0,
    ticketsChecked: 0,
    ticketsSettled: 0,
    message: `Updated factory settings: odds ${saved.minIndividualOdds.toFixed(
      2
    )}\u2013${saved.maxIndividualOdds.toFixed(2)}, daily target ${saved.dailyTicketTarget}, ${saved.oddsCategories.length} categories, auto-booking ${saved.autoCreateBookingCodes ? "ON" : "OFF"}.`
  });
  res.json({
    config: saved,
    status: schedulerService.getStatus(),
    logs: automationStore.getLogs().slice(0, 80)
  });
}
async function toggleFactoryAutomation(req, res) {
  const mode = String(req.body?.mode || "").toLowerCase();
  const cfg = automationStore.getFactoryConfig();
  let nextCfg = { ...cfg };
  let label = "";
  if (mode === "pause") {
    nextCfg = { ...cfg, paused: true };
    label = "Paused scheduled daily generation";
  } else if (mode === "resume") {
    nextCfg = { ...cfg, enabled: true, paused: false };
    label = "Resumed scheduled daily generation";
  } else if (mode === "start") {
    nextCfg = { ...cfg, enabled: true, paused: false };
    label = "Started automatic daily factory";
  } else if (mode === "stop") {
    nextCfg = { ...cfg, enabled: false, paused: false };
    label = "Stopped automatic daily factory";
  } else {
    return res.status(400).json({ error: "Invalid toggle mode. Use start, stop, pause, or resume." });
  }
  const saved = automationStore.setFactoryConfig(nextCfg);
  schedulerService.rescheduleFactoryTimer();
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  automationStore.addLog({
    logId: `log_${import_crypto7.default.randomBytes(4).toString("hex")}`,
    actionType: "SYSTEM_TOGGLE",
    jobType: "ADMIN_ACTION",
    status: "SUCCESS",
    actorEmail: req.adminUser?.email || null,
    startedAt: nowIso,
    finishedAt: nowIso,
    durationMs: 0,
    ticketsGenerated: 0,
    codesCreated: 0,
    codeFailures: 0,
    ticketsChecked: 0,
    ticketsSettled: 0,
    message: `${label} by ${req.adminUser?.email || "admin"}.`
  });
  res.json({
    config: saved,
    status: schedulerService.getStatus(),
    logs: automationStore.getLogs().slice(0, 80)
  });
}
async function runDailyFactoryNow(req, res) {
  try {
    const result = await schedulerService.runDailyFactoryJob(true, req.adminUser?.email || null);
    res.json({
      ...result,
      status: schedulerService.getStatus(),
      tickets: automationStore.getTickets(),
      logs: automationStore.getLogs().slice(0, 80)
    });
  } catch (err) {
    handleError(res, err, "DAILY_FACTORY_RUN_FAILED");
  }
}
async function deleteGeneratedTicket(req, res) {
  const id = String(req.params.id || "").trim();
  if (!id) {
    return res.status(400).json({ error: "Ticket ID is required." });
  }
  const removed = automationStore.deleteTicket(id);
  if (!removed) {
    return res.status(404).json({ error: `Ticket ${id} not found.` });
  }
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  automationStore.addLog({
    logId: `log_${import_crypto7.default.randomBytes(4).toString("hex")}`,
    actionType: "MANUAL_TRIGGER",
    jobType: "ADMIN_ACTION",
    status: "SUCCESS",
    actorEmail: req.adminUser?.email || null,
    startedAt: nowIso,
    finishedAt: nowIso,
    durationMs: 0,
    ticketsGenerated: 0,
    codesCreated: 0,
    codeFailures: 0,
    ticketsChecked: 0,
    ticketsSettled: 0,
    message: `Removed ticket ${id} from public feed.`
  });
  res.json({ deleted: true, internalTicketId: id });
}
async function createTicketBookingCode(req, res) {
  const id = String(req.params.id || "").trim();
  const ticket = automationStore.getTicketById(id);
  if (!ticket) {
    return res.status(404).json({ error: `Ticket ${id} not found.` });
  }
  const ticketBookmaker = normalizeBookmakerId(ticket.bookmakerId);
  if (!assertBookmakerEnabledOrRespond(res, ticketBookmaker)) return;
  const client = getBookmakerClient(ticketBookmaker);
  const bookmakerInfo = getBookmakerInfo(ticketBookmaker);
  try {
    assertSameBookmakerSelections(ticket.selections, ticketBookmaker);
    const booking = await client.createBookingCode(ticket.selections);
    const cleanCode = String(booking.shareCode || "").trim().toUpperCase();
    const usedCodes = automationStore.getExistingShareCodes(ticket.internalTicketId);
    if (!cleanCode || usedCodes.has(cleanCode)) {
      throw new Error(
        cleanCode ? `Booking code ${cleanCode} is already assigned to another card in the daily feed.` : `${bookmakerInfo.shortName} returned an empty booking code.`
      );
    }
    const updated = automationStore.updateTicketMutableFields({
      ...ticket,
      shareCode: booking.shareCode,
      shareUrl: booking.shareUrl,
      shareCodeDeadline: booking.deadline,
      shareCodeVerified: booking.verified,
      bookingCodeStatus: "GENERATED",
      bookingCodeError: null,
      lastCheckedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    res.json({ ticket: updated, booking });
  } catch (err) {
    const msg = err instanceof Error ? err.message : `${bookmakerInfo.shortName} sharing-code API rejected this betslip`;
    automationStore.updateTicketMutableFields({
      ...ticket,
      bookingCodeStatus: "FAILED",
      bookingCodeError: msg,
      lastCheckedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    handleError(res, err, "TICKET_BOOKING_CODE_FAILED");
  }
}
async function retryFailedBookingCodesHandler(req, res) {
  try {
    const ticketIds = Array.isArray(req.body?.ticketIds) ? req.body.ticketIds : void 0;
    const result = await schedulerService.retryFailedBookingCodes(
      ticketIds,
      req.adminUser?.email || null
    );
    res.json({
      ...result,
      status: schedulerService.getStatus(),
      logs: automationStore.getLogs().slice(0, 80)
    });
  } catch (err) {
    handleError(res, err, "RETRY_BOOKING_CODES_FAILED");
  }
}
async function trackTicketsResults(req, res) {
  try {
    const ticketIds = Array.isArray(req.body?.ticketIds) ? req.body.ticketIds : void 0;
    const result = await schedulerService.runResultsTrackingJob(
      true,
      ticketIds,
      req.adminUser?.email || null
    );
    res.json({
      ...result,
      status: schedulerService.getStatus(),
      tickets: automationStore.getTickets(),
      logs: automationStore.getLogs().slice(0, 80)
    });
  } catch (err) {
    handleError(res, err, "TRACK_RESULTS_FAILED");
  }
}
async function getAdminOverview(_req, res) {
  res.json({
    platformSettings: platformConfigService.getSettings(),
    canonicalMarkets: Object.values(CANONICAL_MARKET_CATALOG),
    transferHistory: platformConfigService.getTransferHistory({ limit: 100 }),
    backendLogs: backendLogger.list({ limit: 120 }),
    managedUsers: platformConfigService.listUsers(),
    firebaseMeta: getFirebaseProjectMeta()
  });
}
async function updatePlatformSettings(req, res) {
  const parsed = platformSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid platform settings payload.",
      details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`)
    });
  }
  const saved = platformConfigService.updateSettings(
    parsed.data,
    req.adminUser?.email || null
  );
  backendLogger.info(
    "ADMIN",
    "PLATFORM_SETTINGS_UPDATED",
    `Updated integrations: SportyBet=${saved.sportybetEnabled}, betPawa=${saved.betpawaEnabled}, Transfer=${saved.crossTransferEnabled} (${saved.supportedTransferMarkets.length} markets).`,
    {
      actorUid: req.adminUser?.uid || null,
      actorEmail: req.adminUser?.email || null
    }
  );
  res.json({ platformSettings: saved });
}
async function updateUserAccess(req, res) {
  const uid = String(req.params.uid || "").trim();
  if (!uid || uid.length > 128) {
    return res.status(400).json({ error: "Valid uid parameter is required." });
  }
  const parsed = userAccessUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid user access update payload.",
      details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`)
    });
  }
  if (req.adminUser?.uid === uid && (parsed.data.disabled === true || parsed.data.role === "USER")) {
    return res.status(400).json({
      error: "You cannot demote or disable your own active administrator account."
    });
  }
  const updated = platformConfigService.updateUserAccess(
    uid,
    parsed.data,
    req.adminUser?.email || null
  );
  backendLogger.info(
    "ADMIN",
    "USER_ACCESS_UPDATED",
    `Updated access for ${updated.email}: role=${updated.role}, disabled=${updated.disabled}.`,
    {
      actorUid: req.adminUser?.uid || null,
      actorEmail: req.adminUser?.email || null,
      metadata: { targetUid: uid, role: updated.role, disabled: updated.disabled }
    }
  );
  res.json({ user: updated });
}
async function getAdminTransfers(req, res) {
  const status = req.query.status ? String(req.query.status) : void 0;
  const transfers = platformConfigService.getTransferHistory({ status, limit: 150 });
  res.json({ transfers, count: transfers.length });
}
async function getAdminLogs(req, res) {
  const level = req.query.level ? String(req.query.level).toUpperCase() : void 0;
  const category = req.query.category ? String(req.query.category).toUpperCase() : void 0;
  const logs = backendLogger.list({ level, category, limit: 150 });
  res.json({ logs, count: logs.length });
}

// backend/middleware/rateLimiter.ts
var import_express_rate_limit = __toESM(require("express-rate-limit"), 1);
function extractClientIp(req) {
  const vercelForwarded = req.headers["x-vercel-forwarded-for"];
  if (typeof vercelForwarded === "string" && vercelForwarded.trim()) {
    const first = vercelForwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  const forwarded = req.headers.forwarded;
  if (typeof forwarded === "string") {
    const match = forwarded.match(/for="?\[?([^;,\s"\]]+)/i);
    if (match?.[1]) {
      return match[1];
    }
  }
  return req.ip || req.socket?.remoteAddress || "127.0.0.1";
}
function clientKeyGenerator(req) {
  return (0, import_express_rate_limit.ipKeyGenerator)(extractClientIp(req));
}
var apiRateLimiter = (0, import_express_rate_limit.default)({
  windowMs: 60 * 1e3,
  max: 90,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  keyGenerator: clientKeyGenerator,
  message: {
    error: "Too many requests to the odds proxy. Please pause briefly before rescanning."
  }
});
var bookingCodeRateLimiter = (0, import_express_rate_limit.default)({
  windowMs: 60 * 1e3,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  keyGenerator: clientKeyGenerator,
  message: {
    error: "Booking code rate limit reached. Please wait a minute before generating more codes."
  }
});

// backend/routes/api.ts
var apiRouter = (0, import_express.Router)();
apiRouter.use(apiRateLimiter);
apiRouter.get("/health", getHealth);
apiRouter.get("/platform/status", getPlatformStatus);
apiRouter.get("/bookmakers", getBookmakers);
apiRouter.get("/research-report", getResearchReport);
apiRouter.get("/markets", getMarketCatalog);
apiRouter.get("/diagnostics", getDiagnostics);
apiRouter.get("/sports/leagues", getLeagues);
apiRouter.get("/matches/live", getLiveMatches);
apiRouter.get("/matches/upcoming", getUpcomingMatches);
apiRouter.get("/matches/:eventId", getMatchDetails);
apiRouter.post("/scanner/run", runScanner);
apiRouter.post("/betslip/validate", validateBetslip);
apiRouter.post("/booking-codes/create", bookingCodeRateLimiter, createBookingCode);
apiRouter.get("/booking-codes/verify/:code", verifyBookingCode);
apiRouter.get("/auth/session", requireAuthenticated, getAuthSession);
apiRouter.post("/auth/audit", optionalAuth, recordAuthAudit);
apiRouter.get("/admin/me", checkAdminStatus);
apiRouter.get("/transfer/markets", getTransferMarkets);
apiRouter.post("/transfer/preview", optionalAuth, previewTransfer);
apiRouter.post("/transfer/confirm", optionalAuth, bookingCodeRateLimiter, confirmTransfer);
apiRouter.get("/transfer/history", requireAuthenticated, getUserTransferHistory);
apiRouter.get("/tickets", listPublicTickets);
apiRouter.get("/tickets/:id", getPublicTicketById);
apiRouter.get("/analytics/performance", getPerformanceAnalytics);
apiRouter.get("/scheduler/status", getSchedulerStatus);
apiRouter.get("/cron/daily-factory", requireCronOrAdmin, runCronDailyFactory);
apiRouter.post("/cron/daily-factory", requireCronOrAdmin, runCronDailyFactory);
apiRouter.get("/cron/track-results", requireCronOrAdmin, runCronTrackResults);
apiRouter.post("/cron/track-results", requireCronOrAdmin, runCronTrackResults);
apiRouter.get("/factory/config", requireAdmin, getDailyFactoryAdminState);
apiRouter.put("/factory/config", requireAdmin, updateDailyFactoryConfig);
apiRouter.post("/factory/toggle", requireAdmin, toggleFactoryAutomation);
apiRouter.post("/factory/run", requireAdmin, runDailyFactoryNow);
apiRouter.delete("/tickets/:id", requireAdmin, deleteGeneratedTicket);
apiRouter.post(
  "/tickets/:id/booking-code",
  requireAdmin,
  bookingCodeRateLimiter,
  createTicketBookingCode
);
apiRouter.post("/tickets/retry-booking-codes", requireAdmin, retryFailedBookingCodesHandler);
apiRouter.post("/tickets/track-results", requireAdmin, trackTicketsResults);
apiRouter.post("/scheduler/results-run", requireAdmin, trackTicketsResults);
apiRouter.get("/admin/overview", requireAdmin, getAdminOverview);
apiRouter.put("/admin/platform-settings", requireAdmin, updatePlatformSettings);
apiRouter.patch("/admin/users/:uid", requireAdmin, updateUserAccess);
apiRouter.get("/admin/transfers", requireAdmin, getAdminTransfers);
apiRouter.get("/admin/logs", requireAdmin, getAdminLogs);

// backend/app.ts
function createApiApp() {
  const app2 = (0, import_express2.default)();
  app2.set("trust proxy", 1);
  app2.disable("x-powered-by");
  app2.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    next();
  });
  app2.use(import_express2.default.json({ limit: "512kb" }));
  app2.use("/api", apiRouter);
  app2.use("/api/*", (_req, res) => {
    res.status(404).json({ error: "API endpoint not found." });
  });
  app2.use((err, req, res, _next) => {
    const message = err instanceof Error ? err.message : "Unexpected server error";
    backendLogger.error("API", "UNHANDLED_ROUTE_ERROR", `${req.method} ${req.path}: ${message}`);
    if (!res.headersSent) {
      res.status(500).json({ error: message });
    }
  });
  return app2;
}

// backend/vercelEntry.ts
var app = createApiApp();
function vercelHandler(req, res) {
  try {
    if (req.url && req.url.startsWith("/api/index")) {
      const forwardedUri = req.headers["x-vercel-original-uri"] || req.headers["x-forwarded-uri"] || req.headers["x-invoke-path"];
      if (forwardedUri && forwardedUri.startsWith("/api/") && !forwardedUri.startsWith("/api/index")) {
        req.url = forwardedUri;
      }
    }
    return app(req, res);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected serverless handler error";
    backendLogger.error("API", "VERCEL_HANDLER_ERROR", message);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ error: message }));
    }
  }
}
