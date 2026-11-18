import crypto from 'crypto';
import { getBookmakerInfo } from '../config/bookmakers.ts';
import {
  assertSameBookmakerSelections,
  getBookmakerClient,
} from '../integrations/bookmakerRegistry.ts';
import type {
  BetslipSelection,
  BookmakerId,
  CanonicalMarketId,
  CanonicalMarketInfo,
  NormalizedMarket,
  NormalizedMatch,
  NormalizedOutcome,
  TransferConfirmResponse,
  TransferDirection,
  TransferLegResult,
  TransferMatchCandidate,
  TransferPreviewResponse,
  TransferSourceSelection,
  TransferStatus,
} from '../../src/types/sportybet.ts';
import { backendLogger } from './logger.ts';
import { platformConfigService } from './platformConfigService.ts';

export const CANONICAL_MARKET_CATALOG: Record<CanonicalMarketId, CanonicalMarketInfo> = {
  '1X2_FT': {
    id: '1X2_FT',
    label: 'Match Winner (1X2 | Full Time)',
    sportybetMarketId: '1',
    betpawaMarketId: '3743',
    settlementRule: 'Regular time (90m + stoppage), excludes extra time and penalties.',
  },
  DOUBLE_CHANCE_FT: {
    id: 'DOUBLE_CHANCE_FT',
    label: 'Double Chance (Full Time)',
    sportybetMarketId: '10',
    betpawaMarketId: '4693',
    settlementRule: 'Regular time (1X, 12, or X2), excludes extra time.',
  },
  OVER_UNDER_FT: {
    id: 'OVER_UNDER_FT',
    label: 'Total Goals Over/Under (Full Time)',
    sportybetMarketId: '18',
    betpawaMarketId: '5000',
    settlementRule: 'Exact goal line over regular time (90m + stoppage).',
  },
  BTTS_FT: {
    id: 'BTTS_FT',
    label: 'Both Teams To Score (GG/NG | Full Time)',
    sportybetMarketId: '29',
    betpawaMarketId: '3795',
    settlementRule: 'Both teams score at least 1 goal in regular time (Yes/No).',
  },
  DRAW_NO_BET_FT: {
    id: 'DRAW_NO_BET_FT',
    label: 'Draw No Bet (Full Time)',
    sportybetMarketId: '11',
    betpawaMarketId: '4703',
    settlementRule: 'Home or Away win in regular time; voided (1.00) on draw.',
  },
  ODD_EVEN_FT: {
    id: 'ODD_EVEN_FT',
    label: 'Odd / Even Goals (Full Time)',
    sportybetMarketId: '26',
    betpawaMarketId: '4833',
    settlementRule: 'Total regular-time goals odd or even (0 counts as Even).',
  },
  HOME_OU_FT: {
    id: 'HOME_OU_FT',
    label: 'Home Team Total Goals Over/Under (FT)',
    sportybetMarketId: '19',
    betpawaMarketId: '5006',
    settlementRule: 'Home team goals over/under exact line in regular time.',
  },
  AWAY_OU_FT: {
    id: 'AWAY_OU_FT',
    label: 'Away Team Total Goals Over/Under (FT)',
    sportybetMarketId: '20',
    betpawaMarketId: '5003',
    settlementRule: 'Away team goals over/under exact line in regular time.',
  },
  ASIAN_HANDICAP_FT: {
    id: 'ASIAN_HANDICAP_FT',
    label: 'Asian Handicap (Full Time)',
    sportybetMarketId: '16',
    betpawaMarketId: '3774',
    settlementRule: '2-way goal spread handicap in regular time (exact line required).',
  },
  HT_1X2: {
    id: 'HT_1X2',
    label: '1st Half Winner (1X2)',
    sportybetMarketId: '60',
    betpawaMarketId: '3743_HT',
    settlementRule: 'Settled exclusively on 1st half (45m + stoppage) score.',
  },
  HT_OVER_UNDER: {
    id: 'HT_OVER_UNDER',
    label: '1st Half Total Goals Over/Under',
    sportybetMarketId: '68',
    betpawaMarketId: '5000_HT',
    settlementRule: 'Settled exclusively on 1st half goals.',
  },
  HT_DOUBLE_CHANCE: {
    id: 'HT_DOUBLE_CHANCE',
    label: '1st Half Double Chance',
    sportybetMarketId: '63',
    betpawaMarketId: '4693_HT',
    settlementRule: 'Settled exclusively on 1st half result (1X, 12, X2).',
  },
  HT_BTTS: {
    id: 'HT_BTTS',
    label: '1st Half Both Teams To Score',
    sportybetMarketId: '75',
    betpawaMarketId: '3795_HT',
    settlementRule: 'Both teams score in 1st half only.',
  },
};

const TEAM_NOISE_WORDS = new Set([
  'fc',
  'sc',
  'cf',
  'ac',
  'as',
  'fk',
  'sk',
  'afc',
  'bk',
  'if',
  'nk',
  'ss',
  'sv',
  'tsg',
  'vfb',
  'vfl',
  'club',
  'cd',
  'ud',
  'sd',
  'rc',
  'ca',
  'cs',
  'de',
  'la',
  'the',
  'sports',
  'sport',
  'football',
  'futbol',
  'futebol',
  'soccer',
  'calcio',
  'ec',
  'kv',
  'rsc',
  'krc',
  'tsv',
  'fsv',
  'sg',
  'spvgg',
  'us',
  'uc',
  'ce',
  'cp',
  'ad',
  'gd',
  'rcd',
  'ik',
  'aik',
  'ff',
  'gif',
  'ifk',
  'pfc',
  'ofk',
  'hnk',
  'gnk',
  'bsc',
  'hsc',
  'asc',
  'csc',
  'ks',
  'fk',
  'mk',
  'ac',
  'se',
  'esporte',
  'clube',
]);

const TEAM_TOKEN_EXPANSIONS: Record<string, string> = {
  utd: 'united',
  man: 'manchester',
  sheff: 'sheffield',
  nottm: 'nottingham',
  nott: 'nottingham',
  wolves: 'wolverhampton',
  spurs: 'tottenham',
  gladbach: 'monchengladbach',
  moenchengladbach: 'monchengladbach',
  munich: 'munchen',
  cologne: 'koln',
  kobenhavn: 'copenhagen',
  st: 'saint',
  atl: 'atletico',
  athletico: 'atletico',
  dep: 'deportivo',
  olymp: 'olympique',
  internazionale: 'inter',
  inter: 'inter',
  brom: 'bromwich',
  alb: 'albion',
  boro: 'middlesbrough',
  el: 'al',
};

// Canonical alias equivalence map for common abbreviated vs full club names across bookmakers
const TEAM_CANONICAL_ALIASES: Record<string, string> = {
  psg: 'paris saint germain',
  'paris sg': 'paris saint germain',
  'paris saint germain': 'paris saint germain',
  bvb: 'borussia dortmund',
  'borussia dortmund': 'borussia dortmund',
  dortmund: 'borussia dortmund',
  qpr: 'queens park rangers',
  'queens park rangers': 'queens park rangers',
  yanga: 'young africans',
  'young africans': 'young africans',
  'sporting cp': 'sporting lisbon',
  'sporting lisbon': 'sporting lisbon',
  sporting: 'sporting lisbon',
  'inter milan': 'inter milan',
  inter: 'inter milan',
  milan: 'ac milan',
  'ac milan': 'ac milan',
  'manchester utd': 'manchester united',
  'manchester united': 'manchester united',
  'manchester city': 'manchester city',
  tottenham: 'tottenham hotspur',
  'tottenham hotspur': 'tottenham hotspur',
  wolverhampton: 'wolverhampton wanderers',
  'wolverhampton wanderers': 'wolverhampton wanderers',
  brighton: 'brighton and hove albion',
  'brighton hove albion': 'brighton and hove albion',
  'brighton and hove albion': 'brighton and hove albion',
  'west ham': 'west ham united',
  'west ham united': 'west ham united',
  newcastle: 'newcastle united',
  'newcastle united': 'newcastle united',
  'west bromwich': 'west bromwich albion',
  'west bromwich albion': 'west bromwich albion',
  'bayern munchen': 'bayern munchen',
  bayern: 'bayern munchen',
  'bayer leverkusen': 'bayer leverkusen',
  leverkusen: 'bayer leverkusen',
  'rasenballsport leipzig': 'rb leipzig',
  'rb leipzig': 'rb leipzig',
  leipzig: 'rb leipzig',
  atleti: 'atletico madrid',
  'atletico madrid': 'atletico madrid',
  om: 'olympique marseille',
  marseille: 'olympique marseille',
  'olympique marseille': 'olympique marseille',
  ol: 'olympique lyon',
  lyon: 'olympique lyon',
  'olympique lyonnais': 'olympique lyon',
  'olympique lyon': 'olympique lyon',
  psv: 'psv eindhoven',
  'psv eindhoven': 'psv eindhoven',
  az: 'az alkmaar',
  'az alkmaar': 'az alkmaar',
  ajax: 'ajax amsterdam',
  'ajax amsterdam': 'ajax amsterdam',
  'crvena zvezda': 'red star belgrade',
  'red star belgrade': 'red star belgrade',
};

const SQUAD_QUALIFIER_PATTERNS: Array<{ tag: string; regex: RegExp }> = [
  { tag: 'WOMEN', regex: /\b(women|woman|ladies|fem|femenino|frauen)\b|\(w\)|\bw$/i },
  { tag: 'U23', regex: /\bu[\s-]?23\b/i },
  { tag: 'U21', regex: /\bu[\s-]?21\b/i },
  { tag: 'U20', regex: /\bu[\s-]?20\b/i },
  { tag: 'U19', regex: /\bu[\s-]?19\b/i },
  { tag: 'U18', regex: /\bu[\s-]?18\b/i },
  { tag: 'U17', regex: /\bu[\s-]?17\b/i },
  { tag: 'RESERVES', regex: /\b(reserves|reserve|ii|iii|jong)\b|\(b\)|\bb$/i },
];

function extractSquadQualifiers(teamName: string): Set<string> {
  const tags = new Set<string>();
  for (const p of SQUAD_QUALIFIER_PATTERNS) {
    if (p.regex.test(teamName)) {
      tags.add(p.tag);
    }
  }
  return tags;
}

export function normalizeTeamName(name: string): string {
  const cleaned = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/ø/g, 'o')
    .replace(/ł/g, 'l')
    .replace(/ı/g, 'i')
    .replace(/ß/g, 'ss')
    .replace(/&/g, ' and ')
    .replace(/['’.]/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const expanded = cleaned
    .split(' ')
    .filter(Boolean)
    .map((t) => TEAM_TOKEN_EXPANSIONS[t] || t);

  const tokens = expanded.filter(
    (t) =>
      t.length > 0 &&
      !TEAM_NOISE_WORDS.has(t) &&
      // Strip common founding-year numeric tags (e.g. 04, 05, 96, 1899, 1904)
      !/^(0[1-9]|1[0-9]{3}|20[0-2]\d|9[0-9])$/.test(t)
  );

  return tokens.join(' ').trim() || expanded.join(' ').trim() || cleaned;
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  const curr = new Array<number>(b.length + 1).fill(0);

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

function tokenPairSimilarity(aTok: string, bTok: string): number {
  if (aTok === bTok) return 1;
  // Prefix abbreviation match for meaningful stems >= 4 chars (e.g. "barc" vs "barcelona")
  const minLen = Math.min(aTok.length, bTok.length);
  if (minLen >= 4 && (aTok.startsWith(bTok) || bTok.startsWith(aTok))) {
    return 0.88;
  }
  const maxLen = Math.max(aTok.length, bTok.length);
  if (minLen >= 4) {
    const lev = 1 - levenshteinDistance(aTok, bTok) / maxLen;
    if (lev >= 0.75) return Math.max(0.8, lev);
  }
  return 0;
}

export function computeTeamSimilarity(aRaw: string, bRaw: string): number {
  const qualA = extractSquadQualifiers(aRaw);
  const qualB = extractSquadQualifiers(bRaw);
  if (qualA.size !== qualB.size) return 0;
  for (const tag of qualA) {
    if (!qualB.has(tag)) return 0;
  }

  const aNorm = normalizeTeamName(aRaw);
  const bNorm = normalizeTeamName(bRaw);
  if (!aNorm || !bNorm) return 0;
  if (aNorm === bNorm) return 1;

  const aCanon = TEAM_CANONICAL_ALIASES[aNorm] || aNorm;
  const bCanon = TEAM_CANONICAL_ALIASES[bNorm] || bNorm;
  if (aCanon === bCanon) return 0.97;

  // Reject conflicting distinctive derby/club suffixes like "Manchester United" vs "Manchester City"
  const tokensA = aCanon.split(' ').filter(Boolean);
  const tokensB = bCanon.split(' ').filter(Boolean);
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);

  const conflictingPairs: Array<[string, string]> = [
    ['united', 'city'],
    ['real', 'atletico'],
    ['inter', 'ac'],
    ['rovers', 'wanderers'],
    ['north', 'south'],
    ['east', 'west'],
  ];
  for (const [x, y] of conflictingPairs) {
    if ((setA.has(x) && setB.has(y)) || (setA.has(y) && setB.has(x))) {
      return 0.1;
    }
  }

  // Compact whitespace-stripped check (e.g. "Al Ahly" vs "AlAhly", "Real Madrid" vs "RealMadrid")
  const aCompact = aCanon.replace(/\s+/g, '');
  const bCompact = bCanon.replace(/\s+/g, '');
  if (aCompact === bCompact) return 0.98;

  // Flexible token containment & stem matching so partial names ("Brighton" vs "Brighton & Hove Albion",
  // "B. Dortmund" vs "Borussia Dortmund", "Bayern" vs "Bayern Munchen") match reliably.
  const shorter = tokensA.length <= tokensB.length ? tokensA : tokensB;
  const longer = tokensA.length <= tokensB.length ? tokensB : tokensA;

  let matchedTokenScoreSum = 0;
  let strongTokenHits = 0;
  let exactOrStemMatches = 0;
  for (const sTok of shorter) {
    let bestTokScore = 0;
    for (const lTok of longer) {
      const sim = tokenPairSimilarity(sTok, lTok);
      if (sim > bestTokScore) bestTokScore = sim;
    }
    if (bestTokScore === 0 && sTok.length === 1) {
      // Single-letter initial (e.g., "B" matching "Borussia", "R" matching "Real")
      if (longer.some((lTok) => lTok.startsWith(sTok))) {
        bestTokScore = 0.84;
      }
    } else if (bestTokScore === 0 && sTok.length >= 2 && sTok.length <= 4) {
      // Multi-letter acronym inside longer team (e.g., "sg" matching "saint germain")
      const initials = longer.map((t) => t[0]).join('');
      if (initials.includes(sTok)) {
        bestTokScore = 0.82;
      }
    }
    if (bestTokScore >= 0.75) {
      exactOrStemMatches++;
      if (sTok.length >= 4) strongTokenHits++;
    }
    matchedTokenScoreSum += bestTokScore;
  }

  let containmentSim = 0;
  const avgShorterMatch = shorter.length > 0 ? matchedTokenScoreSum / shorter.length : 0;
  // Require at least one meaningful stem (>= 4 chars) when single-letter initials are involved
  const hasRequiredAnchor =
    strongTokenHits > 0 || shorter.every((t) => t.length >= 3) || exactOrStemMatches === shorter.length;
  if (hasRequiredAnchor && avgShorterMatch >= 0.75) {
    containmentSim = Math.min(
      0.95,
      0.74 + 0.16 * avgShorterMatch + 0.08 * (shorter.length / longer.length)
    );
  }

  let overlap = 0;
  for (const tok of setA) {
    if (setB.has(tok)) {
      overlap += 1;
    } else if (tokensB.some((bTok) => tokenPairSimilarity(tok, bTok) >= 0.8)) {
      overlap += 0.85;
    }
  }
  const jaccard = overlap / Math.max(setA.size, setB.size);

  const maxLen = Math.max(aCanon.length, bCanon.length);
  const levSim = 1 - levenshteinDistance(aCanon, bCanon) / maxLen;
  const compactLevSim =
    1 - levenshteinDistance(aCompact, bCompact) / Math.max(aCompact.length, bCompact.length);

  const substringBonus = aCanon.includes(bCanon) || bCanon.includes(aCanon) ? 0.16 : 0;
  const blended = Math.min(
    1,
    jaccard * 0.5 + Math.max(levSim, compactLevSim) * 0.5 + substringBonus
  );

  return Math.min(1, Number(Math.max(blended, containmentSim).toFixed(4)));
}

export function matchFixtureToCandidates(
  source: Pick<
    TransferSourceSelection,
    'homeTeam' | 'awayTeam' | 'leagueName' | 'estimateStartTime'
  >,
  candidates: NormalizedMatch[]
): {
  bestMatch: NormalizedMatch | null;
  confidence: number;
  rankedCandidates: TransferMatchCandidate[];
  reason: string;
} {
  const scored: Array<{ match: NormalizedMatch; score: number; reason: string }> = [];
  const nearMisses: Array<{ match: NormalizedMatch; score: number; reason: string }> = [];

  for (const cand of candidates) {
    const homeSim = computeTeamSimilarity(source.homeTeam, cand.homeTeam);
    const awaySim = computeTeamSimilarity(source.awayTeam, cand.awayTeam);
    if (Math.min(homeSim, awaySim) < 0.35) continue;

    let timeScore = 0.85;
    let timeDeltaHours = 0;
    if (source.estimateStartTime && source.estimateStartTime > 0 && cand.estimateStartTime > 0) {
      timeDeltaHours = Math.abs(source.estimateStartTime - cand.estimateStartTime) / 3600000;
      if (timeDeltaHours > 18) {
        continue; // Same teams on a different matchweek
      }
      if (timeDeltaHours <= 0.5) timeScore = 1;
      else if (timeDeltaHours <= 3) timeScore = 0.94;
      else if (timeDeltaHours <= 8) timeScore = 0.86;
      else timeScore = 0.78;
    }

    const leagueBonus =
      source.leagueName &&
      cand.leagueName &&
      computeTeamSimilarity(source.leagueName, cand.leagueName) >= 0.55
        ? 0.05
        : 0;

    const total = Math.min(
      1,
      Number(((homeSim * 0.45 + awaySim * 0.45) * timeScore + 0.1 * timeScore + leagueBonus).toFixed(4))
    );

    const reasonText = `Teams ${(homeSim * 100).toFixed(0)}% / ${(awaySim * 100).toFixed(0)}%${
      source.estimateStartTime ? `, kickoff Δ ${timeDeltaHours.toFixed(1)}h` : ''
    }`;

    const minSide = Math.min(homeSim, awaySim);
    const avgSide = (homeSim + awaySim) / 2;

    if (
      (minSide >= 0.48 && total >= 0.60) ||
      (timeDeltaHours <= 0.5 && minSide >= 0.44 && avgSide >= 0.60 && total >= 0.58)
    ) {
      scored.push({
        match: cand,
        score: total,
        reason: reasonText,
      });
    } else if (total >= 0.45) {
      nearMisses.push({
        match: cand,
        score: total,
        reason: reasonText,
      });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  nearMisses.sort((a, b) => b.score - a.score);

  const rankedPool = scored.length > 0 ? scored : nearMisses;
  const rankedCandidates: TransferMatchCandidate[] = rankedPool.slice(0, 3).map((s) => ({
    eventId: s.match.eventId,
    homeTeam: s.match.homeTeam,
    awayTeam: s.match.awayTeam,
    leagueName: s.match.leagueName,
    country: s.match.country,
    estimateStartTime: s.match.estimateStartTime,
    confidenceScore: s.score,
    reason: s.reason,
  }));

  if (scored.length === 0) {
    return {
      bestMatch: null,
      confidence: 0,
      rankedCandidates,
      reason: `Fixture "${source.homeTeam} vs ${source.awayTeam}" not found among active upcoming/live matches on target bookmaker.`,
    };
  }

  return {
    bestMatch: scored[0].match,
    confidence: scored[0].score,
    rankedCandidates,
    reason: scored[0].reason,
  };
}

export interface CanonicalMarketResolution {
  canonicalMarket: CanonicalMarketId;
  line: string | null; // e.g. "1.5", "2.5", "-0.5"
  canonicalOutcome: string; // e.g. "1X", "OVER", "YES", "HOME"
  settlementRuleNote: string;
}

function extractNumericLine(text: string): string | null {
  if (!text) return null;
  const keyedMatch = /(?:total|hcp|handicap|line)\s*=\s*([+-]?\d+(?:\.\d+)?)/i.exec(text);
  const raw = keyedMatch?.[1] || text.match(/([+-]?\d+(?:\.\d+)?)/)?.[1];
  if (!raw) return null;
  const num = Number(raw);
  if (!Number.isFinite(num)) return null;
  // Normalize 2.50 -> 2.5, keep -0.5 as -0.5
  return String(num);
}

function detectPeriod(marketName: string, marketId?: string): 'HT' | '2H' | 'FT' {
  const n = marketName.toLowerCase();
  if (
    /\b(1st\s*[-]?\s*half|first\s*[-]?\s*half|half[\s-]*time|1st\s*period)\b/i.test(n) ||
    marketId === '60' ||
    marketId === '63' ||
    marketId === '68' ||
    marketId === '75'
  ) {
    return 'HT';
  }
  if (/\b(2nd\s*[-]?\s*half|second\s*[-]?\s*half|2nd\s*period)\b/i.test(n)) {
    return '2H';
  }
  return 'FT';
}

export function extractCleanBookingCode(rawInput: string): string {
  const raw = (rawInput || '').trim();
  if (!raw) return '';
  const paramMatch = /(?:shareCode|bookingNumber|code)=([A-Za-z0-9_-]{3,32})/i.exec(raw);
  if (paramMatch?.[1]) return paramMatch[1].toUpperCase();
  const pathMatch = /\/(?:share|booking-number)\/([A-Za-z0-9_-]{3,32})/i.exec(raw);
  if (pathMatch?.[1]) return pathMatch[1].toUpperCase();
  return raw.replace(/[^A-Za-z0-9_-]/g, '').toUpperCase().slice(0, 32);
}

export function resolveCanonicalSelection(
  input: {
    bookmakerId: BookmakerId;
    marketId?: string;
    marketName: string;
    specifier?: string;
    outcomeId?: string;
    outcomeDesc: string;
    homeTeam: string;
    awayTeam: string;
  }
): CanonicalMarketResolution | null {
  const mId = String(input.marketId || '').trim();
  const mName = input.marketName.toLowerCase().trim();
  const spec = String(input.specifier || '').trim();
  const oId = String(input.outcomeId || '').trim();
  const oDesc = input.outcomeDesc.toLowerCase().trim();
  const homeNorm = normalizeTeamName(input.homeTeam);
  const awayNorm = normalizeTeamName(input.awayTeam);
  const oDescNorm = normalizeTeamName(input.outcomeDesc);
  const period = detectPeriod(input.marketName, mId);

  // Guard against unsupported 2nd half or special player/corner/card markets silently mapping to FT
  if (period === '2H' || /corner|card|booking|penalty|scorer|minute|exact score|correct score/i.test(mName)) {
    return null;
  }

  // 1. 1X2 (Match Winner)
  const is1X2 =
    (input.bookmakerId === 'SPORTYBET_TZ' && (mId === '1' || mId === '60')) ||
    (input.bookmakerId === 'BETPAWA_TZ' && mId === '3743') ||
    /\b1x2\b|match winner|full time result|match result|3[\s-]*way|\b1st half\b.*\b1x2\b/i.test(mName);

  if (is1X2 && !mName.includes('double chance') && !mName.includes('handicap')) {
    let outcome: string | null = null;
    if (
      oDesc === '1' ||
      oDesc === 'home' ||
      /^1\b|\(1\)$/.test(oDesc) ||
      (homeNorm && (oDescNorm === homeNorm || computeTeamSimilarity(input.outcomeDesc, input.homeTeam) >= 0.72)) ||
      (input.bookmakerId === 'SPORTYBET_TZ' && mId === '1' && oId === '1')
    ) {
      outcome = 'HOME';
    } else if (
      oDesc === 'x' ||
      oDesc === 'draw' ||
      /^draw\b|\(x\)$/.test(oDesc) ||
      (input.bookmakerId === 'SPORTYBET_TZ' && mId === '1' && oId === '2')
    ) {
      outcome = 'DRAW';
    } else if (
      oDesc === '2' ||
      oDesc === 'away' ||
      /^2\b|\(2\)$/.test(oDesc) ||
      (awayNorm && (oDescNorm === awayNorm || computeTeamSimilarity(input.outcomeDesc, input.awayTeam) >= 0.72)) ||
      (input.bookmakerId === 'SPORTYBET_TZ' && mId === '1' && oId === '3')
    ) {
      outcome = 'AWAY';
    }
    if (!outcome) return null;
    const cm: CanonicalMarketId = period === 'HT' ? 'HT_1X2' : '1X2_FT';
    return {
      canonicalMarket: cm,
      line: null,
      canonicalOutcome: outcome,
      settlementRuleNote: CANONICAL_MARKET_CATALOG[cm].settlementRule,
    };
  }

  // 2. Double Chance
  const isDC =
    (input.bookmakerId === 'SPORTYBET_TZ' && (mId === '10' || mId === '63')) ||
    (input.bookmakerId === 'BETPAWA_TZ' && mId === '4693') ||
    /double chance/i.test(mName);

  if (isDC) {
    let outcome: string | null = null;
    const compact = oDesc.replace(/[\s/()-]+/g, '');
    if (
      compact === '1x' ||
      compact === '1orx' ||
      compact === 'homeordraw' ||
      compact === '1ordraw' ||
      (oDesc.includes('draw') &&
        (oDesc.includes('home') ||
          (homeNorm && (oDescNorm.includes(homeNorm) || computeTeamSimilarity(oDesc.replace(/draw|or/gi, ' '), input.homeTeam) >= 0.7)))) ||
      (input.bookmakerId === 'SPORTYBET_TZ' && mId === '10' && oId === '9')
    ) {
      outcome = '1X';
    } else if (
      compact === '12' ||
      compact === '1or2' ||
      compact === 'homeoraway' ||
      (oDesc.includes('home') && oDesc.includes('away')) ||
      (homeNorm && awayNorm && oDescNorm.includes(homeNorm) && oDescNorm.includes(awayNorm)) ||
      (input.bookmakerId === 'SPORTYBET_TZ' && mId === '10' && oId === '10')
    ) {
      outcome = '12';
    } else if (
      compact === 'x2' ||
      compact === '2x' ||
      compact === 'xor2' ||
      compact === '2orx' ||
      compact === 'draworaway' ||
      compact === 'awayordraw' ||
      compact === 'drawor2' ||
      (oDesc.includes('draw') &&
        (oDesc.includes('away') ||
          (awayNorm && (oDescNorm.includes(awayNorm) || computeTeamSimilarity(oDesc.replace(/draw|or/gi, ' '), input.awayTeam) >= 0.7)))) ||
      (input.bookmakerId === 'SPORTYBET_TZ' && mId === '10' && oId === '11')
    ) {
      outcome = 'X2';
    }
    if (!outcome) return null;
    const cm: CanonicalMarketId = period === 'HT' ? 'HT_DOUBLE_CHANCE' : 'DOUBLE_CHANCE_FT';
    return {
      canonicalMarket: cm,
      line: null,
      canonicalOutcome: outcome,
      settlementRuleNote: CANONICAL_MARKET_CATALOG[cm].settlementRule,
    };
  }

  // 3. Home / Away Team Total Goals Over/Under
  const mNameNorm = normalizeTeamName(input.marketName);
  const isHomeOU =
    (input.bookmakerId === 'SPORTYBET_TZ' && mId === '19') ||
    (input.bookmakerId === 'BETPAWA_TZ' && mId === '5006') ||
    (/\bhome\b/i.test(mName) && /over|under|total/i.test(mName)) ||
    (homeNorm.length >= 3 && mNameNorm.includes(homeNorm) && /over|under|total/i.test(mName));

  const isAwayOU =
    (input.bookmakerId === 'SPORTYBET_TZ' && mId === '20') ||
    (input.bookmakerId === 'BETPAWA_TZ' && mId === '5003') ||
    (/\baway\b/i.test(mName) && /over|under|total/i.test(mName)) ||
    (awayNorm.length >= 3 && mNameNorm.includes(awayNorm) && /over|under|total/i.test(mName));

  if ((isHomeOU || isAwayOU) && period === 'FT') {
    const line = extractNumericLine(spec) || extractNumericLine(oDesc);
    const side = oDesc.includes('over') ? 'OVER' : oDesc.includes('under') ? 'UNDER' : null;
    if (!line || !side) return null;
    const cm: CanonicalMarketId = isHomeOU ? 'HOME_OU_FT' : 'AWAY_OU_FT';
    return {
      canonicalMarket: cm,
      line,
      canonicalOutcome: `${side}_${line}`,
      settlementRuleNote: CANONICAL_MARKET_CATALOG[cm].settlementRule,
    };
  }

  // 4. Match Total Goals Over/Under
  const isOU =
    (input.bookmakerId === 'SPORTYBET_TZ' && (mId === '18' || mId === '68')) ||
    (input.bookmakerId === 'BETPAWA_TZ' && mId === '5000') ||
    (/over\s*\/?\s*under|total\s+goals|\bo\s*\/\s*u\b/i.test(mName) &&
      !mName.includes('&') &&
      !mName.includes('gg') &&
      !mName.includes('btts'));

  if (isOU) {
    const line = extractNumericLine(spec) || extractNumericLine(oDesc);
    const side = oDesc.includes('over') ? 'OVER' : oDesc.includes('under') ? 'UNDER' : null;
    if (!line || !side) return null;
    const cm: CanonicalMarketId = period === 'HT' ? 'HT_OVER_UNDER' : 'OVER_UNDER_FT';
    return {
      canonicalMarket: cm,
      line,
      canonicalOutcome: `${side}_${line}`,
      settlementRuleNote: CANONICAL_MARKET_CATALOG[cm].settlementRule,
    };
  }

  // 5. Both Teams To Score (GG/NG)
  const isBTTS =
    (input.bookmakerId === 'SPORTYBET_TZ' && (mId === '29' || mId === '75')) ||
    (input.bookmakerId === 'BETPAWA_TZ' && mId === '3795') ||
    /both teams to score|both teams score|gg\s*\/?\s*ng|\bbtts\b/i.test(mName);

  if (isBTTS && !mName.includes('&') && !mName.includes('over')) {
    let outcome: string | null = null;
    if (/\b(yes|gg)\b/i.test(oDesc) && !/\bno\b/i.test(oDesc)) outcome = 'YES';
    else if (/\b(no|ng)\b/i.test(oDesc) && !/\byes\b/i.test(oDesc)) outcome = 'NO';
    if (!outcome) return null;
    const cm: CanonicalMarketId = period === 'HT' ? 'HT_BTTS' : 'BTTS_FT';
    return {
      canonicalMarket: cm,
      line: null,
      canonicalOutcome: outcome,
      settlementRuleNote: CANONICAL_MARKET_CATALOG[cm].settlementRule,
    };
  }

  // 6. Draw No Bet
  const isDNB =
    (input.bookmakerId === 'SPORTYBET_TZ' && mId === '11') ||
    (input.bookmakerId === 'BETPAWA_TZ' && mId === '4703') ||
    /draw no bet|\bdnb\b/i.test(mName);

  if (isDNB && period === 'FT') {
    let outcome: string | null = null;
    if (
      oDesc === '1' ||
      oDesc === 'home' ||
      /^home\b|\b1\b/.test(oDesc) ||
      (input.bookmakerId === 'SPORTYBET_TZ' && mId === '11' && oId === '4') ||
      (homeNorm && (oDescNorm === homeNorm || computeTeamSimilarity(input.outcomeDesc, input.homeTeam) >= 0.7))
    ) {
      outcome = 'HOME';
    } else if (
      oDesc === '2' ||
      oDesc === 'away' ||
      /^away\b|\b2\b/.test(oDesc) ||
      (input.bookmakerId === 'SPORTYBET_TZ' && mId === '11' && oId === '5') ||
      (awayNorm && (oDescNorm === awayNorm || computeTeamSimilarity(input.outcomeDesc, input.awayTeam) >= 0.7))
    ) {
      outcome = 'AWAY';
    }
    if (!outcome) return null;
    return {
      canonicalMarket: 'DRAW_NO_BET_FT',
      line: null,
      canonicalOutcome: outcome,
      settlementRuleNote: CANONICAL_MARKET_CATALOG.DRAW_NO_BET_FT.settlementRule,
    };
  }

  // 7. Odd / Even Goals
  const isOE =
    (input.bookmakerId === 'SPORTYBET_TZ' && mId === '26') ||
    (input.bookmakerId === 'BETPAWA_TZ' && mId === '4833') ||
    /odd\s*\/?\s*even/i.test(mName);

  if (isOE && period === 'FT') {
    let outcome: string | null = null;
    if (/\bodd\b/i.test(oDesc) && !/\beven\b/i.test(oDesc)) outcome = 'ODD';
    else if (/\beven\b/i.test(oDesc) && !/\bodd\b/i.test(oDesc)) outcome = 'EVEN';
    if (!outcome) return null;
    return {
      canonicalMarket: 'ODD_EVEN_FT',
      line: null,
      canonicalOutcome: outcome,
      settlementRuleNote: CANONICAL_MARKET_CATALOG.ODD_EVEN_FT.settlementRule,
    };
  }

  // 8. Asian Handicap (2-way)
  const isAH =
    (input.bookmakerId === 'SPORTYBET_TZ' && mId === '16') ||
    (input.bookmakerId === 'BETPAWA_TZ' && mId === '3774') ||
    /asian handicap/i.test(mName);

  if (isAH && period === 'FT' && !mName.includes('european') && !mName.includes('3-way')) {
    const line = extractNumericLine(oDesc) || extractNumericLine(spec);
    if (!line) return null;
    let side: 'HOME' | 'AWAY' | null = null;
    if (
      oDesc.includes('home') ||
      oDesc.startsWith('1 ') ||
      (homeNorm && (oDescNorm.includes(homeNorm) || computeTeamSimilarity(oDesc.replace(/[()+-.\d]/g, ' '), input.homeTeam) >= 0.7))
    ) {
      side = 'HOME';
    } else if (
      oDesc.includes('away') ||
      oDesc.startsWith('2 ') ||
      (awayNorm && (oDescNorm.includes(awayNorm) || computeTeamSimilarity(oDesc.replace(/[()+-.\d]/g, ' '), input.awayTeam) >= 0.7))
    ) {
      side = 'AWAY';
    }
    if (!side) return null;
    return {
      canonicalMarket: 'ASIAN_HANDICAP_FT',
      line,
      canonicalOutcome: `${side}_${line}`,
      settlementRuleNote: CANONICAL_MARKET_CATALOG.ASIAN_HANDICAP_FT.settlementRule,
    };
  }

  return null;
}

export function findExactTargetMarketOutcome(
  targetMatch: NormalizedMatch,
  targetBookmaker: BookmakerId,
  sourceCanonical: CanonicalMarketResolution
): { market: NormalizedMarket; outcome: NormalizedOutcome } | null {
  for (const m of targetMatch.markets) {
    if (m.banned || m.status !== 0) continue;
    for (const o of m.outcomes) {
      if (!o.isActive || o.odds <= 1.0) continue;
      const candCanonical = resolveCanonicalSelection({
        bookmakerId: targetBookmaker,
        marketId: m.marketId,
        marketName: m.desc || m.name,
        specifier: m.specifier,
        outcomeId: o.outcomeId,
        outcomeDesc: o.desc,
        homeTeam: targetMatch.homeTeam,
        awayTeam: targetMatch.awayTeam,
      });

      if (!candCanonical) continue;
      if (
        candCanonical.canonicalMarket === sourceCanonical.canonicalMarket &&
        candCanonical.canonicalOutcome === sourceCanonical.canonicalOutcome &&
        candCanonical.line === sourceCanonical.line
      ) {
        return { market: m, outcome: o };
      }
    }
  }
  return null;
}

async function fetchCandidatePoolForBookmaker(
  targetBookmaker: BookmakerId,
  sourceSelections: TransferSourceSelection[] = []
): Promise<NormalizedMatch[]> {
  const client = getBookmakerClient(targetBookmaker);
  const requests: Promise<NormalizedMatch[]>[] = [
    client.getLiveMatches().catch(() => [] as NormalizedMatch[]),
    client
      .getUpcomingMatches({ pageNum: 1, pageSize: 100, maxPages: 10 })
      .then((res) => res.matches)
      .catch(() => [] as NormalizedMatch[]),
  ];

  // When transferring to SportyBet, include non-football feeds if any leg could belong to Basketball/Tennis/Hockey/etc.
  if (targetBookmaker === 'SPORTYBET_TZ') {
    const extraSportIds = new Set<string>();
    for (const s of sourceSelections) {
      const m = `${s.marketName} ${s.leagueName || ''}`.toLowerCase();
      if (/point|quarter|basket|nba|euroleague/i.test(m)) extraSportIds.add('sr:sport:2');
      if (/set|tennis|atp|wta|games/i.test(m)) extraSportIds.add('sr:sport:5');
      if (/puck|hockey|nhl|khl/i.test(m)) extraSportIds.add('sr:sport:4');
      if (/volleyball/i.test(m)) extraSportIds.add('sr:sport:23');
      if (/handball/i.test(m)) extraSportIds.add('sr:sport:6');
    }
    for (const sportId of extraSportIds) {
      requests.push(client.getLiveMatches(sportId).catch(() => [] as NormalizedMatch[]));
      requests.push(
        client
          .getUpcomingMatches({ pageNum: 1, pageSize: 100, maxPages: 3, sportId })
          .then((res) => res.matches)
          .catch(() => [] as NormalizedMatch[])
      );
    }
  }

  const batches = await Promise.all(requests);
  const byId = new Map<string, NormalizedMatch>();
  for (const list of batches) {
    for (const m of list) {
      if (!byId.has(m.eventId)) {
        byId.set(m.eventId, m);
      }
    }
  }
  return Array.from(byId.values());
}

export function getBookmakerHandoffUrl(bookmakerId: BookmakerId): string {
  return getBookmakerInfo(bookmakerId).websiteUrl;
}

export async function previewCrossBookmakerTransfer(params: {
  direction: TransferDirection;
  bookingCode?: string;
  manualSelections?: TransferSourceSelection[];
  actorUid?: string | null;
  actorEmail?: string | null;
}): Promise<TransferPreviewResponse> {
  const sourceBookmaker: BookmakerId =
    params.direction === 'SPORTYBET_TO_BETPAWA' ? 'SPORTYBET_TZ' : 'BETPAWA_TZ';
  const targetBookmaker: BookmakerId =
    params.direction === 'SPORTYBET_TO_BETPAWA' ? 'BETPAWA_TZ' : 'SPORTYBET_TZ';

  const sourceInfo = getBookmakerInfo(sourceBookmaker);
  const targetInfo = getBookmakerInfo(targetBookmaker);
  const transferId = `tr_${crypto.randomBytes(5).toString('hex')}`;
  const checkedAt = new Date().toISOString();
  const cleanCode = extractCleanBookingCode(params.bookingCode || '');
  const manualHandoffUrl = getBookmakerHandoffUrl(targetBookmaker);

  let sourceSelections: TransferSourceSelection[] = [];
  const warnings: string[] = [];

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
        eventId: s.eventId,
      }));
    } catch (err) {
      const errMsg =
        err instanceof Error
          ? err.message
          : `Unable to import booking code ${cleanCode} from ${sourceInfo.shortName}.`;

      backendLogger.warn('TRANSFER', 'SOURCE_CODE_IMPORT_FAILED', errMsg, {
        actorUid: params.actorUid,
        actorEmail: params.actorEmail,
        metadata: { direction: params.direction, code: cleanCode },
      });

      const failedPreview: TransferPreviewResponse = {
        transferId,
        direction: params.direction,
        sourceBookmaker,
        sourceBookmakerName: sourceInfo.name,
        targetBookmaker,
        targetBookmakerName: targetInfo.name,
        originalCode: cleanCode,
        status: 'MANUAL_IMPORT_REQUIRED',
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
          'You can still enter or paste the original selections manually below to match and transfer them.',
        ],
        manualHandoffUrl,
        checkedAt,
      };

      platformConfigService.recordTransfer({
        transferId,
        direction: params.direction,
        sourceBookmaker,
        targetBookmaker,
        originalCode: cleanCode,
        targetBookingCode: null,
        targetShareUrl: null,
        status: 'MANUAL_IMPORT_REQUIRED',
        originalSelectionCount: 0,
        matchedCount: 0,
        unmatchedCount: 0,
        originalCombinedOdds: 1,
        targetCombinedOdds: null,
        actorUid: params.actorUid || null,
        actorEmail: params.actorEmail || null,
        errorMessage: errMsg,
        createdAt: checkedAt,
      });

      return failedPreview;
    }
  } else if (params.manualSelections && params.manualSelections.length > 0) {
    sourceSelections = params.manualSelections;
  }

  const originalCombinedOdds = Number(
    sourceSelections.reduce((acc, s) => acc * (Number(s.odds) || 1), 1).toFixed(2)
  );

  const candidatePool = await fetchCandidatePoolForBookmaker(targetBookmaker, sourceSelections);
  const targetClient = getBookmakerClient(targetBookmaker);
  const enabledMarkets = new Set(platformConfigService.getSettings().supportedTransferMarkets);

  const detailedMatchCache = new Map<string, NormalizedMatch>();
  const legs: TransferLegResult[] = [];
  const matchedSelections: BetslipSelection[] = [];

  for (const src of sourceSelections) {
    const canonical = resolveCanonicalSelection({
      bookmakerId: sourceBookmaker,
      marketId: src.marketId,
      marketName: src.marketName,
      specifier: src.specifier,
      outcomeId: src.outcomeId,
      outcomeDesc: src.outcomeDesc,
      homeTeam: src.homeTeam,
      awayTeam: src.awayTeam,
    });

    if (!canonical) {
      legs.push({
        sourceSelection: src,
        status: 'UNAVAILABLE',
        canonicalMarket: null,
        canonicalOutcome: null,
        targetSelection: null,
        targetOdds: null,
        oddsDifference: null,
        matchConfidence: 0,
        settlementRuleNote: 'No verified equivalent market settlement rule across both platforms.',
        reason: `Market "${src.marketName}" (${src.outcomeDesc}) has no verified 1:1 cross-bookmaker mapping. Outcome not substituted.`,
      });
      continue;
    }

    if (!enabledMarkets.has(canonical.canonicalMarket)) {
      legs.push({
        sourceSelection: src,
        status: 'UNAVAILABLE',
        canonicalMarket: canonical.canonicalMarket,
        canonicalOutcome: canonical.canonicalOutcome,
        targetSelection: null,
        targetOdds: null,
        oddsDifference: null,
        matchConfidence: 0,
        settlementRuleNote: canonical.settlementRuleNote,
        reason: `Market "${canonical.canonicalMarket}" is currently disabled for cross-bookmaker transfer by administrator settings.`,
      });
      continue;
    }

    const fixtureMatch = matchFixtureToCandidates(src, candidatePool);
    if (!fixtureMatch.bestMatch) {
      legs.push({
        sourceSelection: src,
        status: 'UNMATCHED',
        canonicalMarket: canonical.canonicalMarket,
        canonicalOutcome: canonical.canonicalOutcome,
        targetSelection: null,
        targetOdds: null,
        oddsDifference: null,
        matchConfidence: 0,
        settlementRuleNote: canonical.settlementRuleNote,
        reason: fixtureMatch.reason,
        candidateMatches: fixtureMatch.rankedCandidates,
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
        status: 'MATCH_STARTED',
        canonicalMarket: canonical.canonicalMarket,
        canonicalOutcome: canonical.canonicalOutcome,
        targetSelection: null,
        targetOdds: null,
        oddsDifference: null,
        matchConfidence: fixtureMatch.confidence,
        settlementRuleNote: canonical.settlementRuleNote,
        reason: `Match "${fullTargetMatch.homeTeam} vs ${fullTargetMatch.awayTeam}" is already live or closed (${fullTargetMatch.matchStatus}) on ${targetInfo.shortName}.`,
        candidateMatches: fixtureMatch.rankedCandidates,
      });
      continue;
    }

    const exactHit = findExactTargetMarketOutcome(fullTargetMatch, targetBookmaker, canonical);
    if (!exactHit) {
      legs.push({
        sourceSelection: src,
        status: 'UNAVAILABLE',
        canonicalMarket: canonical.canonicalMarket,
        canonicalOutcome: canonical.canonicalOutcome,
        targetSelection: null,
        targetOdds: null,
        oddsDifference: null,
        matchConfidence: fixtureMatch.confidence,
        settlementRuleNote: canonical.settlementRuleNote,
        reason: `Exact selection "${src.marketName}: ${src.outcomeDesc}" is unavailable or suspended on ${targetInfo.shortName} for ${fullTargetMatch.homeTeam} vs ${fullTargetMatch.awayTeam}.`,
        candidateMatches: fixtureMatch.rankedCandidates,
      });
      continue;
    }

    const targetOdds = exactHit.outcome.odds;
    const oddsDifference = Number((targetOdds - src.odds).toFixed(2));
    const selectionKey = `${fullTargetMatch.eventId}::${exactHit.market.marketId}::${exactHit.market.specifier}::${exactHit.outcome.outcomeId}`;

    const targetSelection: BetslipSelection = {
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
      addedAt: checkedAt,
    };

    matchedSelections.push(targetSelection);
    legs.push({
      sourceSelection: src,
      status: Math.abs(oddsDifference) >= 0.01 ? 'ODDS_CHANGED' : 'MATCHED',
      canonicalMarket: canonical.canonicalMarket,
      canonicalOutcome: canonical.canonicalOutcome,
      targetSelection,
      targetOdds,
      oddsDifference,
      matchConfidence: fixtureMatch.confidence,
      settlementRuleNote: canonical.settlementRuleNote,
      reason:
        Math.abs(oddsDifference) >= 0.01
          ? `Exact match verified (${fixtureMatch.reason}); target odds ${targetOdds.toFixed(2)} vs original ${src.odds.toFixed(2)}.`
          : `Exact fixture, market, and outcome verified (${fixtureMatch.reason}).`,
      candidateMatches: fixtureMatch.rankedCandidates,
    });
  }

  const matchedCount = matchedSelections.length;
  const unmatchedCount = legs.filter((l) => l.status === 'UNMATCHED').length;
  const unavailableCount = legs.filter(
    (l) => l.status === 'UNAVAILABLE' || l.status === 'MATCH_STARTED'
  ).length;

  let status: TransferStatus = 'READY_TO_REVIEW';
  if (matchedCount === 0) {
    status = 'UNAVAILABLE_SELECTIONS';
    warnings.push(
      `No selections could be matched cleanly on ${targetInfo.shortName}. Review unavailable reasons below.`
    );
  } else if (unmatchedCount > 0 || unavailableCount > 0) {
    status = 'PARTIALLY_MATCHED';
    warnings.push(
      `${matchedCount} of ${sourceSelections.length} selection(s) matched. Remove or review unavailable legs before confirming.`
    );
  }

  const targetCombinedOdds =
    matchedCount > 0
      ? Number(matchedSelections.reduce((acc, s) => acc * s.odds, 1).toFixed(2))
      : null;

  platformConfigService.recordTransfer({
    transferId,
    direction: params.direction,
    sourceBookmaker,
    targetBookmaker,
    originalCode: cleanCode || 'MANUAL',
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
    createdAt: checkedAt,
  });

  backendLogger.info(
    'TRANSFER',
    'TRANSFER_PREVIEW',
    `${sourceInfo.shortName} -> ${targetInfo.shortName} preview (${cleanCode || 'MANUAL'}): ${matchedCount}/${sourceSelections.length} matched (${status}).`,
    { actorUid: params.actorUid, actorEmail: params.actorEmail }
  );

  return {
    transferId,
    direction: params.direction,
    sourceBookmaker,
    sourceBookmakerName: sourceInfo.name,
    targetBookmaker,
    targetBookmakerName: targetInfo.name,
    originalCode: cleanCode || 'MANUAL',
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
    checkedAt,
  };
}

export async function confirmCrossBookmakerTransfer(params: {
  transferId?: string;
  direction: TransferDirection;
  originalCode: string;
  originalSelectionCount: number;
  originalCombinedOdds: number;
  confirmedSelections: BetslipSelection[];
  actorUid?: string | null;
  actorEmail?: string | null;
}): Promise<TransferConfirmResponse> {
  const sourceBookmaker: BookmakerId =
    params.direction === 'SPORTYBET_TO_BETPAWA' ? 'SPORTYBET_TZ' : 'BETPAWA_TZ';
  const targetBookmaker: BookmakerId =
    params.direction === 'SPORTYBET_TO_BETPAWA' ? 'BETPAWA_TZ' : 'SPORTYBET_TZ';
  const targetInfo = getBookmakerInfo(targetBookmaker);
  const transferId = params.transferId || `tr_${crypto.randomBytes(5).toString('hex')}`;
  const confirmedAt = new Date().toISOString();
  const manualHandoffUrl = getBookmakerHandoffUrl(targetBookmaker);

  assertSameBookmakerSelections(params.confirmedSelections, targetBookmaker);
  const targetClient = getBookmakerClient(targetBookmaker);

  try {
    const booking = await targetClient.createBookingCode(params.confirmedSelections);
    if (!booking.shareCode) {
      throw new Error(
        `${targetInfo.shortName} returned an empty booking code response. Use manual handoff instead.`
      );
    }

    platformConfigService.recordTransfer({
      transferId,
      direction: params.direction,
      sourceBookmaker,
      targetBookmaker,
      originalCode: params.originalCode || 'MANUAL',
      targetBookingCode: booking.shareCode,
      targetShareUrl: booking.shareUrl,
      status: 'TRANSFERRED',
      originalSelectionCount: params.originalSelectionCount,
      matchedCount: booking.selectionCount,
      unmatchedCount: Math.max(0, params.originalSelectionCount - booking.selectionCount),
      originalCombinedOdds: params.originalCombinedOdds,
      targetCombinedOdds: booking.combinedOdds,
      actorUid: params.actorUid || null,
      actorEmail: params.actorEmail || null,
      errorMessage: null,
      createdAt: confirmedAt,
    });

    backendLogger.info(
      'TRANSFER',
      'TRANSFER_CONFIRMED',
      `Genuine ${targetInfo.shortName} booking code ${booking.shareCode} generated & verified for transfer ${transferId}.`,
      { actorUid: params.actorUid, actorEmail: params.actorEmail }
    );

    return {
      transferId,
      direction: params.direction,
      sourceBookmaker,
      targetBookmaker,
      originalCode: params.originalCode || 'MANUAL',
      status: 'TRANSFERRED',
      targetBookingCode: booking.shareCode,
      targetShareUrl: booking.shareUrl,
      verified: booking.verified,
      selectionCount: booking.selectionCount,
      originalCombinedOdds: params.originalCombinedOdds,
      targetCombinedOdds: booking.combinedOdds,
      confirmedSelections: booking.selections,
      manualHandoffUrl,
      errorMessage: null,
      confirmedAt,
    };
  } catch (err) {
    const errMsg =
      err instanceof Error
        ? err.message
        : `${targetInfo.shortName} booking code creation failed.`;
    const recalculated = Number(
      params.confirmedSelections.reduce((acc, s) => acc * s.odds, 1).toFixed(2)
    );

    platformConfigService.recordTransfer({
      transferId,
      direction: params.direction,
      sourceBookmaker,
      targetBookmaker,
      originalCode: params.originalCode || 'MANUAL',
      targetBookingCode: null,
      targetShareUrl: null,
      status: 'FAILED',
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
      createdAt: confirmedAt,
    });

    backendLogger.error('TRANSFER', 'TRANSFER_CONFIRM_FAILED', errMsg, {
      actorUid: params.actorUid,
      actorEmail: params.actorEmail,
    });

    return {
      transferId,
      direction: params.direction,
      sourceBookmaker,
      targetBookmaker,
      originalCode: params.originalCode || 'MANUAL',
      status: 'FAILED',
      targetBookingCode: null,
      targetShareUrl: null,
      verified: false,
      selectionCount: params.confirmedSelections.length,
      originalCombinedOdds: params.originalCombinedOdds,
      targetCombinedOdds: recalculated,
      confirmedSelections: params.confirmedSelections,
      manualHandoffUrl,
      errorMessage: errMsg,
      confirmedAt,
    };
  }
}
