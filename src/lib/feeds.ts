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

export interface GitHubStats {
  /** Across the Tazama organisation. */
  commits: number;
  mergedPulls: number;
  /** Standing among the contributors to DEMS, Tazama's event monitoring service, by commits. */
  dems: { rank: number; contributors: number; share: number };
}

type RawEntry = { 'yt:videoId': string; title: string; published: string };
type RawItem = { title: string; link: string; pubDate: string; 'content:encoded'?: string };
type RawCount = { difficulty: string; count: number };
type RawSearch = { total_count: number };
type RawContributor = { login: string; contributions: number };

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

// Last known videos, used when YouTube's feed is unreachable at build time.
const YOUTUBE_SNAPSHOT: { title: string; videos: [id: string, title: string, published: string][] } = {
  title: 'Code with AR',
  videos: [
    ['o_nYEyIP31U', 'Foundation - deep dive into how we extend core Tazama - TMS breakdown - Part 1', '2026-09-28'],
    ['AWIbZIhLJtM', 'What makes a senior engineer? A simple lesson in Design patterns.', '2026-09-27'],
    ['d4ceYA-mHQY', 'Back after a year | Leetcode 1386| Cinema seat allocation | from first principles', '2026-08-30'],
    ['1_1LreF2yKs', 'Day 736 | Leetcode 2169 | Count Operations to Obtain Zero', '2025-11-09'],
    ['vpazGJUzpPc', "Day 735 | Longest Subarray of 1's After Deleting One Element | Sliding Window | LC 1493", '2025-08-24'],
    ['JLEx_0vdKsk', 'Day 733 | Leetcode 3195 | Find the Minimum Area to Cover All Ones I - Clear thought process', '2025-08-22'],
    ['Rai07IaZ7Vw', 'Day 726 - Learn C++ STL bitset concept - Leetcode 342 - Power of Four', '2025-08-15'],
    ['0C4OuXX49Eo', 'Day 723 - Master thinking from first principles - Ways to Express an Integer as Sum of Powers', '2025-08-14'],
    ['JAF1cnhECYU', 'Day 708 - Master the basic template of RECURSION in 20 mins - Foundational Concepts IV', '2025-07-28'],
    ['IyEx1wU1q98', 'Day 700 - The single video you need to understand Sliding Window - Foundational Concepts III', '2025-07-22'],
    ['kFft7UEcCuo', 'Day 698 - Foundational Concepts II - Longest Increasing Subsequence - Brute force to Optimal', '2025-07-20'],
    ['EmjqbK_j4jQ', 'Day 697 | Learn the basic template of Recursion in just 11 mins | Leetcode 78 | Subsets', '2025-07-20'],
    ['cGEBg_NPARY', 'Day 696 | Leetcode 3291| Find the Maximum Length of Valid Subsequence I', '2025-07-16'],
    ['4deSddAd_f4', 'Day 693 | Leetcode 1290 | Convert Binary Number in a Linked List to Integer', '2025-07-14'],
    ['eiznp8c98mk', 'Day 692 | Maximum matching of Players with trainers | Simple thought process', '2025-07-13'],
  ],
};

// Last known numbers, used when GitHub's API is unreachable or rate-limited at build time.
const GITHUB_SNAPSHOT: GitHubStats = {
  commits: 661,
  mergedPulls: 23,
  dems: { rank: 1, contributors: 11, share: 326 / 439 },
};

const TAZAMA_ORG = 'tazama-lf';
const DEMS_REPO = 'event-monitoring-service';
// GitHub's API rejects requests that carry no User-Agent.
const GITHUB_HEADERS = { Accept: 'application/vnd.github+json', 'User-Agent': site.url };

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

const toVideo = (id: string, title: string, published: string): Video => ({
  id,
  title,
  url: `https://www.youtube.com/watch?v=${id}`,
  thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
  published: new Date(published),
});

async function loadChannel(): Promise<Channel> {
  const [xml, page] = await Promise.all([
    fetchText(`https://www.youtube.com/feeds/videos.xml?channel_id=${site.youtubeChannelId}`),
    fetchText(site.links.youtube, { headers: { 'Accept-Language': 'en' } }),
  ]);
  const feed = xml ? parser.parse(xml).feed : undefined;
  const entries = toArray<RawEntry>(feed?.entry);
  // The feed carries only the latest 15 videos; the total is read from the channel page.
  const count = page?.match(/"(\d[\d,]*) videos"/)?.[1];
  const videoCount = count ? Number(count.replace(/,/g, '')) : null;

  if (!feed || entries.length === 0) {
    console.warn('[feeds] YouTube feed unavailable, using snapshot');
    return {
      title: YOUTUBE_SNAPSHOT.title,
      videoCount,
      videos: YOUTUBE_SNAPSHOT.videos.map((video) => toVideo(...video)),
    };
  }

  return {
    title: feed.title,
    videoCount,
    videos: entries.map((entry) => toVideo(entry['yt:videoId'], entry.title, entry.published)),
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

async function loadGitHub(): Promise<GitHubStats> {
  const scope = `author:${site.githubUsername} org:${TAZAMA_ORG}`;
  const get = async <T>(path: string) =>
    parseJson<T>(await fetchText(`https://api.github.com${path}`, { headers: GITHUB_HEADERS }));

  const [commits, pulls, contributors] = await Promise.all([
    get<RawSearch>(`/search/commits?${new URLSearchParams({ q: scope, per_page: '1' })}`),
    get<RawSearch>(`/search/issues?${new URLSearchParams({ q: `${scope} is:pr is:merged`, per_page: '1' })}`),
    get<RawContributor[]>(`/repos/${TAZAMA_ORG}/${DEMS_REPO}/contributors?per_page=100`),
  ]);
  const mine = Array.isArray(contributors) ? contributors.findIndex((c) => c.login === site.githubUsername) : -1;
  if (!commits || !pulls || !contributors || mine < 0) {
    console.warn('[feeds] GitHub unavailable, using snapshot');
    return GITHUB_SNAPSHOT;
  }

  const total = contributors.reduce((sum, c) => sum + c.contributions, 0);
  return {
    commits: commits.total_count,
    mergedPulls: pulls.total_count,
    dems: { rank: mine + 1, contributors: contributors.length, share: contributors[mine].contributions / total },
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
export const getGitHub = once(loadGitHub);
