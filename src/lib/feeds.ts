import { XMLParser } from 'fast-xml-parser';
import { site } from '../site';

export interface Video {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  published: Date;
}

export interface Channel {
  title: string;
  videoCount: number | null;
  videos: Video[];
}

export interface Post {
  title: string;
  url: string;
  published: Date;
  excerpt: string;
  cover?: string;
}

export interface Difficulty {
  label: 'Easy' | 'Medium' | 'Hard';
  solved: number;
  total: number;
}

export interface LeetCodeStats {
  solved: number;
  ranking: number;
  difficulties: Difficulty[];
}

type RawEntry = { 'yt:videoId': string; title: string; published: string };
type RawItem = { title: string; link: string; pubDate: string; 'content:encoded'?: string };
type RawCount = { difficulty: string; count: number };

const TIMEOUT_MS = 10_000;
// Keep tag text as strings: a numeric-looking title must not become a number.
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', parseTagValue: false });

// Last known numbers, used when LeetCode's unofficial API is unreachable at build time.
const LEETCODE_SNAPSHOT: LeetCodeStats = {
  solved: 1110,
  ranking: 24524,
  difficulties: [
    { label: 'Easy', solved: 377, total: 968 },
    { label: 'Medium', solved: 593, total: 2122 },
    { label: 'Hard', solved: 140, total: 979 },
  ],
};

const LEETCODE_QUERY = `query ($username: String!) {
  allQuestionsCount { difficulty count }
  matchedUser(username: $username) {
    profile { ranking }
    submitStatsGlobal { acSubmissionNum { difficulty count } }
  }
}`;

// Sources are read at build time; a failing source degrades to a plain link, never a failed build.
async function fetchText(url: string, init?: RequestInit): Promise<string | null> {
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (err) {
    console.warn(`[feeds] ${url}: ${(err as Error).message}`);
    return null;
  }
}

function parseJson<T>(text: string | null): T | null {
  try {
    return text ? (JSON.parse(text) as T) : null;
  } catch {
    return null;
  }
}

const toArray = <T>(value: T | T[] | undefined): T[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

const stripTags = (html: string) => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, text.lastIndexOf(' ', max))}…`;
}

async function loadChannel(): Promise<Channel> {
  const [xml, page] = await Promise.all([
    fetchText(`https://www.youtube.com/feeds/videos.xml?channel_id=${site.youtubeChannelId}`),
    fetchText(site.links.youtube, { headers: { 'Accept-Language': 'en' } }),
  ]);
  const feed = xml ? parser.parse(xml).feed : undefined;
  // The feed carries only the latest 15 videos; the total is read from the channel page.
  const count = page?.match(/"(\d[\d,]*) videos"/)?.[1];

  return {
    title: feed?.title ?? 'YouTube',
    videoCount: count ? Number(count.replace(/,/g, '')) : null,
    videos: toArray<RawEntry>(feed?.entry).map((entry) => {
      const id = entry['yt:videoId'];
      return {
        id,
        title: entry.title,
        url: `https://www.youtube.com/watch?v=${id}`,
        thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        published: new Date(entry.published),
      };
    }),
  };
}

async function loadPosts(): Promise<Post[]> {
  const xml = await fetchText(`https://medium.com/feed/@${site.mediumUsername}`);
  if (!xml) return [];

  return toArray<RawItem>(parser.parse(xml).rss?.channel?.item).map((item) => {
    const html = item['content:encoded'] ?? '';
    return {
      title: item.title,
      url: item.link.split('?')[0],
      published: new Date(item.pubDate),
      excerpt: clip(stripTags(html.match(/<p>(.*?)<\/p>/s)?.[1] ?? ''), 220),
      cover: html.match(/<img[^>]+src="([^"]+)"/)?.[1],
    };
  });
}

async function loadLeetCode(): Promise<LeetCodeStats> {
  const response = parseJson<{
    data?: {
      allQuestionsCount: RawCount[];
      matchedUser: { profile: { ranking: number }; submitStatsGlobal: { acSubmissionNum: RawCount[] } } | null;
    };
  }>(
    await fetchText('https://leetcode.com/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Referer: site.links.leetcode },
      body: JSON.stringify({ query: LEETCODE_QUERY, variables: { username: site.leetcodeUsername } }),
    }),
  );
  const user = response?.data?.matchedUser;
  if (!response?.data || !user) {
    console.warn('[feeds] LeetCode unavailable, using snapshot');
    return LEETCODE_SNAPSHOT;
  }

  const solved = new Map(user.submitStatsGlobal.acSubmissionNum.map((c) => [c.difficulty, c.count]));
  const totals = new Map(response.data.allQuestionsCount.map((c) => [c.difficulty, c.count]));
  return {
    solved: solved.get('All') ?? 0,
    ranking: user.profile.ranking,
    difficulties: (['Easy', 'Medium', 'Hard'] as const).map((label) => ({
      label,
      solved: solved.get(label) ?? 0,
      total: totals.get(label) ?? 0,
    })),
  };
}

// Several pages read the same source; fetch each once per build.
function once<T>(load: () => Promise<T>): () => Promise<T> {
  let pending: Promise<T> | undefined;
  return () => (pending ??= load());
}

export const getChannel = once(loadChannel);
export const getPosts = once(loadPosts);
export const getLeetCode = once(loadLeetCode);
