import { promises as fs } from 'fs';
import { join } from 'path';

const DOMAIN = 'ytmp3.gl';
const ORIGIN = `https://${DOMAIN}`;
const API = 'https://gamma.gammacloud.net/api/v1';
const FORMAT = 'mp3';
const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36';
const bunRuntime = /** @type {any} */ (globalThis)['Bun'];

function browserHeaders(extra = {}) {
  return {
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    Origin: ORIGIN,
    Referer: `${ORIGIN}/`,
    'User-Agent': UA,
    'Sec-CH-UA': '"Chromium";v="152", "Not?A_Brand";v="24", "Brave";v="152"',
    'Sec-CH-UA-Mobile': '?0',
    'Sec-CH-UA-Platform': '"Linux"',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'cross-site',
    ...extra,
  };
}

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  if (bunRuntime && typeof bunRuntime.sleep === 'function') {
    return bunRuntime.sleep(ms);
  }

  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {string|number|undefined} input
 * @returns {string}
 */
export function normalizeSongQuery(input) {
  const raw = String(input ?? '').trim();
  if (!raw) return '';

  const normalized = raw
    .toLowerCase()
    .replace(/https?:\/\/[^\s]+/gi, ' ')
    .replace(/\s*[-|/]+\s*/g, ' ')
    .replace(/\b(?:by|feat(?:uring)?|ft|official|audio|lyric(?:s)?|video|music|track)\b/gi, ' ')
    .replace(/[\u2013\u2014]/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return normalized;
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function isVideoId(value) {
  return typeof value === 'string' && value.length === 11 && /^[A-Za-z0-9_-]+$/.test(value);
}

/**
 * @param {string|number|undefined} input
 * @returns {string}
 */
export function extractVideoId(input) {
  const raw = String(input ?? '').trim();

  if (isVideoId(raw)) {
    return raw;
  }

  let value = raw;

  if (!/^[A-Za-z][A-Za-z0-9+.:]*:/.test(value)) {
    value = `https://${value}`;
  }

  let url;

  try {
    url = new URL(value);
  } catch {
    throw new Error('Invalid YouTube URL');
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  let id = '';

  if (host === 'youtu.be') {
    id = url.pathname.split('/').filter(Boolean)[0] || '';
  } else if (
    host === 'youtube.com' ||
    host === 'm.youtube.com' ||
    host === 'music.youtube.com' ||
    host === 'gaming.youtube.com' ||
    host === 'youtube-nocookie.com'
  ) {
    id = url.searchParams.get('v') || '';

    if (!id) {
      const parts = url.pathname.split('/').filter(Boolean);
      const prefixes = new Set(['embed', 'shorts', 'live', 'v']);

      if (parts.length >= 2 && parts[0] && prefixes.has(parts[0])) {
        id = String(parts[1] ?? '');
      }
    }

    if (!id && url.pathname === '/attribution_link') {
      const nested = url.searchParams.get('u');

      if (nested) {
        return extractVideoId(new URL(nested, 'https://youtube.com').toString());
      }
    }
  }

  if (!isVideoId(id)) {
    throw new Error('Could not extract an 11 character YouTube video ID');
  }

  return id;
}

/**
 * @param {string} candidate
 * @returns {boolean}
 */
function isLikelyFalsePositiveVideoId(candidate) {
  return candidate === 'GUIDED_HELP' || candidate === 'SERVICE_TRACKING' || candidate === 'context';
}

/**
 * @param {unknown} value
 * @returns {string|null}
 */
function findFirstVideoId(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findFirstVideoId(item);
      if (found) return found;
    }
    return null;
  }

  if (typeof value !== 'object') {
    return null;
  }

  const resultShapeKeys = new Set([
    'title',
    'thumbnail',
    'lengthText',
    'viewCountText',
    'shortBylineText',
    'channelThumbnail',
    'videoId',
  ]);

  const rendererKeys = new Set([
    'videoRenderer',
    'compactVideoRenderer',
    'shortVideoRenderer',
    'reelItemRenderer',
    'richItemRenderer',
  ]);

  for (const key of rendererKeys) {
    const nested = /** @type {any} */ (value)[key];
    if (nested && typeof nested === 'object') {
      const found = findFirstVideoId(nested);
      if (found) return found;
    }
  }

  const directVideoId = /** @type {any} */ (value).videoId;
  const hasResultShape = Object.keys(/** @type {Record<string, unknown>} */ (value)).some((key) =>
    resultShapeKeys.has(key),
  );

  if (
    typeof directVideoId === 'string' &&
    isVideoId(directVideoId) &&
    !isLikelyFalsePositiveVideoId(directVideoId) &&
    hasResultShape
  ) {
    return directVideoId;
  }

  for (const nested of Object.values(/** @type {Record<string, unknown>} */ (value))) {
    if (nested && typeof nested === 'object') {
      const found = findFirstVideoId(nested);
      if (found) return found;
    }
  }

  return null;
}

/**
 * @param {string|number|undefined} query
 * @returns {Promise<string>}
 */
export async function searchYoutubeVideoId(query) {
  const normalized = normalizeSongQuery(query);
  if (!normalized) {
    throw new Error('No search query provided');
  }

  const candidates = new Set([normalized]);
  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    candidates.add(words.slice(0, Math.max(2, Math.ceil(words.length / 2))).join(' '));
    candidates.add(words.filter((word) => !['by'].includes(word)).join(' '));
  }

  const trialQueries = [...candidates];

  for (const candidate of trialQueries) {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(candidate)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: browserHeaders({
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }),
      redirect: 'follow',
    });

    if (!response.ok) {
      continue;
    }

    const html = await response.text();
    const htmlMatch = html.match(/"videoId":"([A-Za-z0-9_-]{11})"/);
    if (htmlMatch) {
      const candidateId = String(htmlMatch[1] ?? '');
      if (!isLikelyFalsePositiveVideoId(candidateId)) {
        return candidateId;
      }
    }

    const apiKeyMatch = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/);
    const clientVersionMatch = html.match(/"INNERTUBE_CONTEXT_CLIENT_VERSION":"([^"]+)"/);

    if (!apiKeyMatch || !clientVersionMatch) {
      continue;
    }

    const apiKey = apiKeyMatch[1];
    const clientVersion = clientVersionMatch[1];

    if (!apiKey || !clientVersion) {
      continue;
    }

    const apiUrl = `https://www.youtube.com/youtubei/v1/search?key=${encodeURIComponent(apiKey)}`;
    const searchResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': UA,
        'X-Youtube-Client-Name': '1',
        'X-Youtube-Client-Version': clientVersion,
        Origin: 'https://www.youtube.com',
        Referer: `https://www.youtube.com/results?search_query=${encodeURIComponent(candidate)}`,
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'WEB',
            clientVersion,
            hl: 'en',
            gl: 'US',
            utcOffsetMinutes: 0,
          },
        },
        query: candidate,
        params: 'EgIQAQ%3D%3D',
      }),
    });

    if (!searchResponse.ok) {
      continue;
    }

    const result = await searchResponse.json();
    const jsonMatch = findFirstVideoId(result);

    if (jsonMatch) {
      return jsonMatch;
    }
  }

  throw new Error(`Could not find a YouTube result for: ${normalized}`);
}

/**
 * @param {string|number|undefined} input
 * @param {{ allowSearch?: boolean }} [options]
 * @returns {Promise<string>}
 */
export async function resolveVideoId(input, options = {}) {
  const { allowSearch = true } = options;
  const raw = String(input ?? '').trim();

  if (!raw) {
    throw new Error('No YouTube URL or search query provided');
  }

  if (isVideoId(raw)) {
    return raw;
  }

  try {
    return extractVideoId(raw);
  } catch (error) {
    if (!allowSearch) {
      throw error;
    }
  }

  const normalized = normalizeSongQuery(raw);
  if (!normalized) {
    throw new Error('No valid song details could be extracted from the message');
  }

  return searchYoutubeVideoId(normalized);
}

/**
 * @param {string} url
 * @param {Record<string, string>} [headers]
 * @returns {Promise<any>}
 */
async function getJson(url, headers = {}) {
  const response = await fetch(url, {
    method: 'GET',
    headers: browserHeaders(headers),
    redirect: 'follow',
  });

  const text = await response.text();

  let body;

  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(
      `Expected JSON from ${url}, received HTTP ${response.status}: ${text.slice(0, 500)}`,
    );
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from ${url}: ${JSON.stringify(body)}`);
  }

  if (Number(body.error ?? body.err ?? 0) > 0) {
    throw new Error(`API error ${body.error ?? body.err}: ${JSON.stringify(body)}`);
  }

  return body;
}

async function authorize() {
  return getJson(`${API}/auth?_=${Date.now()}`);
}

/**
 * @param {string} key
 * @returns {Promise<any>}
 */
async function initialize(key) {
  return getJson(`${API}/init?_=${Date.now()}`, {
    Authorization: `Bearer ${key}`,
  });
}

/**
 * @param {string} base
 * @param {string} videoId
 * @returns {string}
 */
function buildConvertUrl(base, videoId) {
  const url = new URL(base);
  url.searchParams.set('v', videoId);
  url.searchParams.set('f', FORMAT);
  url.searchParams.set('_', String(Date.now()));
  return url.toString();
}

/**
 * @param {string} convertUrl
 * @param {string} videoId
 * @returns {Promise<any>}
 */
async function convert(convertUrl, videoId) {
  let current = buildConvertUrl(convertUrl, videoId);

  for (let i = 0; i < 10; i++) {
    const result = await getJson(current);

    if (Number(result.redirect) === 1 && result.redirectURL) {
      current = buildConvertUrl(result.redirectURL, videoId);
      continue;
    }

    return result;
  }

  throw new Error('Conversion redirect limit exceeded');
}

/**
 * @param {any} result
 * @returns {Promise<any>}
 */
async function waitForConversion(result) {
  if (!result.progressURL) {
    return result;
  }

  let title = result.title || '';

  for (;;) {
    const url = new URL(result.progressURL);
    url.searchParams.set('_', String(Date.now()));

    const progress = await getJson(url.toString());

    if (progress.title) {
      title = progress.title;
    }

    if (Number(progress.progress) >= 3) {
      return {
        ...result,
        ...progress,
        title: progress.title || title || result.title || '',
        downloadURL: progress.downloadURL || result.downloadURL,
      };
    }

    await sleep(3000);
  }
}

/**
 * @param {any} result
 * @param {boolean|undefined} geo
 * @returns {Promise<any>}
 */
async function finishConversion(result, geo) {
  if (geo) {
    await sleep(9000);

    return {
      title: result.title || '',
      downloadURL: result.downloadURL || '',
    };
  }

  return waitForConversion(result);
}

/**
 * @param {string|number|undefined} query
 * @returns {string}
 */
export function fallbackTitleFromQuery(query) {
  const cleaned = normalizeSongQuery(query)
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

  return cleaned || 'Untitled Song';
}

/**
 * @param {string|undefined} title
 * @param {string|number|undefined} [query]
 * @returns {string}
 */
export function exactFilename(title, query) {
  const sourceTitle = title && String(title).trim() ? String(title) : fallbackTitleFromQuery(query);

  const safeTitle = sourceTitle
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!safeTitle) {
    throw new Error('The exact YouTube title cannot be represented as one Linux filename');
  }

  return `${safeTitle}.mp3`;
}

/**
 * @param {string} downloadURL
 * @param {string} videoId
 * @param {string} title
 * @param {string} [outputDir]
 * @returns {Promise<{ filename: string, filePath: string }>}
 */
export async function download(downloadURL, videoId, title, outputDir = process.cwd()) {
  await fs.mkdir(outputDir, { recursive: true });

  const url = new URL(downloadURL);
  url.searchParams.set('v', videoId);
  url.searchParams.set('f', FORMAT);
  url.searchParams.set('r', DOMAIN);

  const response = await fetch(url, {
    method: 'GET',
    headers: browserHeaders(),
    redirect: 'follow',
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Download failed with HTTP ${response.status}: ${text.slice(0, 500)}`);
  }

  if (!response.body) {
    throw new Error('Download response has no body');
  }

  const filename = exactFilename(title, videoId);
  const destination = join(outputDir, filename);

  if (bunRuntime && typeof bunRuntime.file === 'function') {
    const writer = bunRuntime.file(destination).writer();
    const reader = response.body.getReader();

    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        writer.write(value);
      }
    } finally {
      await writer.end();
    }

    return { filename, filePath: destination };
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const firstBytes = buffer.subarray(0, Math.min(buffer.length, 256)).toString('utf8');
  const looksLikeJsonError =
    /^\s*(?:\{|\[)/.test(firstBytes) &&
    /"(?:progress|error|title|message|downloadURL|redirect)"/i.test(firstBytes);

  if (looksLikeJsonError) {
    try {
      const parsed = JSON.parse(firstBytes);
      const message =
        typeof parsed?.message === 'string'
          ? parsed.message
          : typeof parsed?.error === 'string'
            ? parsed.error
            : JSON.stringify(parsed).slice(0, 400);
      throw new Error(`Converter returned an error payload instead of audio: ${message}`);
    } catch (error) {
      if (!(error instanceof SyntaxError)) {
        throw error;
      }
    }
  }

  await fs.writeFile(destination, buffer);

  return { filename, filePath: destination };
}

/**
 * @param {string|number|undefined} input
 * @param {string} [outputDir]
 * @returns {Promise<{ videoId: string, title: string, filename: string, filePath: string, downloadURL: string }>}
 */
export async function downloadSongFromQuery(input, outputDir = process.cwd()) {
  const videoId = await resolveVideoId(input);

  const auth = await authorize();
  if (!auth.key) {
    throw new Error(`Authorization response did not contain a key: ${JSON.stringify(auth)}`);
  }

  const init = await initialize(auth.key);
  if (!init.convertURL) {
    throw new Error(`Initialization response did not contain convertURL: ${JSON.stringify(init)}`);
  }

  let result = await convert(init.convertURL, videoId);
  result = await finishConversion(result, auth.geo);

  if (!result.downloadURL) {
    throw new Error(`Conversion response did not contain downloadURL: ${JSON.stringify(result)}`);
  }

  const resolvedTitle =
    result.title && String(result.title).trim()
      ? String(result.title)
      : fallbackTitleFromQuery(input);

  const downloaded = await download(result.downloadURL, videoId, resolvedTitle, outputDir);

  return {
    videoId,
    title: resolvedTitle,
    filename: downloaded.filename,
    filePath: downloaded.filePath,
    downloadURL: result.downloadURL,
  };
}

async function main() {
  const input = process.argv.slice(2).join(' ').trim();

  if (!input) {
    console.error(`Usage: node ${process.argv[1]} <youtube url or video id or song name>`);
    process.exit(1);
  }

  const videoId = await resolveVideoId(input);

  console.log(`Video ID: ${videoId}`);
  console.log('Authorizing');

  const auth = await authorize();

  if (!auth.key) {
    throw new Error(`Authorization response did not contain a key: ${JSON.stringify(auth)}`);
  }

  console.log('Initializing');

  const init = await initialize(auth.key);

  if (!init.convertURL) {
    throw new Error(`Initialization response did not contain convertURL: ${JSON.stringify(init)}`);
  }

  console.log('Converting');

  let result = await convert(init.convertURL, videoId);
  result = await finishConversion(result, auth.geo);

  if (!result.downloadURL) {
    throw new Error(`Conversion response did not contain downloadURL: ${JSON.stringify(result)}`);
  }

  if (!result.title) {
    throw new Error(`Conversion completed without a title: ${JSON.stringify(result)}`);
  }

  console.log(`Title: ${result.title}`);
  console.log('Downloading');

  const downloaded = await download(result.downloadURL, videoId, result.title);

  console.log(`Saved: ${downloaded.filename}`);
}

if (process.argv[1] && process.argv[1].endsWith('youtube-to-mp3-converter.js')) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
