import { getGitHub } from '../lib/feeds';
import { formatNumber } from '../lib/format';

export interface Stage {
  name: string;
  detail: string;
}

export interface Stat {
  value: string;
  /** For a before-and-after figure: shown as "from → value". */
  from?: string;
  /** Reads on from the value: "661" + "commits to Tazama…". */
  label: string;
  /** Where a reader can check the number. */
  source?: { label: string; href: string };
}

export interface Project {
  slug: string;
  name: string;
  tag: string;
  /** H1 on the project page: plain lead, a phrase in the serif voice, then an optional tail. */
  headline: { lead: string; voice: string; tail?: string };
  summary: string;
  role: string;
  flow: string[];
  lede: string;
  stack: string[];
  /** Under the page intro; the first one also goes on the home card. */
  stats: Stat[];
  stages: Stage[];
  strengths: string[];
  part: string[];
  links: { label: string; href: string }[];
}

// Read from GitHub at build time, like the other live numbers on the site.
const github = await getGitHub();

export const projects: Project[] = [
  {
    slug: 'tazama',
    name: 'Tazama FRMS',
    tag: 'Open source · Linux Foundation',
    headline: { lead: 'Catching fraud', voice: 'in real time', tail: '.' },
    summary:
      'An open-source, real-time engine that detects fraud and money-laundering patterns in payment traffic. A pure backend engine: scalable, resilient, and built around a beautiful core pipeline.',
    role: 'Extending the core pipeline to ingest any kind of transaction message.',
    flow: ['TMS', 'Event Director', 'Rules', 'Typologies', 'Adjudicator'],
    lede:
      'Tazama is an open-source, real-time transaction monitoring platform that helps financial institutions and payment ecosystems detect fraud and money-laundering typologies. The project is managed by the Linux Foundation and funded by the Gates Foundation.',
    stack: ['TypeScript', 'NestJS', 'NATS', 'ISO 20022'],
    stats: [
      {
        value: `#${github.dems.rank}`,
        label: `of ${github.dems.contributors} contributors to DEMS, Tazama's event monitoring service, with ${Math.round(github.dems.share * 100)}% of its commits.`,
        source: { label: 'Contributors graph', href: 'https://github.com/tazama-lf/event-monitoring-service/graphs/contributors' },
      },
      {
        from: '4',
        value: 'any',
        label: 'message types Tazama can ingest, with TCS and DEMS.',
        source: { label: 'The article', href: 'https://medium.com/@abdulrahimio/extending-tazama-a-deep-dive-part-1-8b255035d334' },
      },
      {
        value: formatNumber(github.commits),
        label: `commits to Tazama, and ${github.mergedPulls} merged pull requests.`,
        source: { label: 'GitHub search', href: 'https://github.com/search?q=author%3Aabdul-rahim-psl+org%3Atazama-lf&type=commits' },
      },
      {
        from: '1 day',
        value: '2 hours',
        label: 'to update a fraud rule, with Rule Studio.',
        source: { label: 'Rule Studio', href: 'https://github.com/tazama-lf/rule-studio' },
      },
    ],
    stages: [
      {
        name: 'Transaction Monitoring Service',
        detail:
          'Accepts ISO 20022 payment messages over HTTP from payment providers, extracts what the pipeline needs and writes it into a historical graph.',
      },
      {
        name: 'Event Director',
        detail: 'Reads the active network map and routes each transaction to the rules that should evaluate it.',
      },
      {
        name: 'Rule processors',
        detail: 'Each rule evaluates one signal about the transaction against its history.',
      },
      {
        name: 'Typology processor',
        detail:
          'Combines rule results into typology scores: weighted patterns of known fraud and money-laundering behaviour.',
      },
      {
        name: 'Event Adjudicator',
        detail: 'Collects the typology results and decides whether the transaction raises an alert.',
      },
      {
        name: 'Case management',
        detail: 'Alerts land with investigators, who work them as cases.',
      },
    ],
    strengths: [
      'A pure backend engine with a beautiful core pipeline: every transaction flows from ingestion through rules, typologies and adjudication.',
      'Scalable and resilient: after ingestion, every stage talks over NATS, so each one scales on its own.',
      'Configuration over code: a network map decides which rules and typologies run, and typology scoring is configuration-driven.',
      'Real time by design, and open source: managed by the Linux Foundation.',
    ],
    part: [
      "Tazama's Transaction Monitoring Service ingested exactly four ISO 20022 messages (pain.001, pain.013, pacs.008 and pacs.002), each through its own hard-coded handler. A fifth message meant a fifth handler, and that doesn't scale.",
      'So we designed two services instead. Tazama Connection Studio (TCS) lets a user configure a new kind of transaction message. Dynamic Event Monitoring (DEMS) ingests it live through a single catch-all endpoint: it extracts data from a payload of any shape, decides at runtime which functions to invoke, and extends the data model when a message needs it.',
      'The result: new message types reach the core pipeline without touching its code, so new rules and typologies can evaluate them.',
      'I also work on Rule Studio, where analysts configure and test fraud rules without a redeploy. A rule update that took a day now takes two hours.',
    ],
    links: [
      { label: 'Video: how we extend core Tazama', href: 'https://www.youtube.com/watch?v=o_nYEyIP31U' },
      { label: 'Article: Extending Tazama, part 1', href: 'https://medium.com/@abdulrahimio/extending-tazama-a-deep-dive-part-1-8b255035d334' },
      { label: 'Tazama on GitHub', href: 'https://github.com/tazama-lf' },
      { label: 'tazama.org', href: 'https://www.tazama.org/' },
    ],
  },
  {
    slug: 'comesa-clearing-house',
    name: 'COMESA Clearing House × Tazama',
    tag: 'Integration · Mojaloop',
    headline: { lead: 'One hub,', voice: 'many payment systems', tail: '.' },
    summary:
      'A regional clearing house built on the Mojaloop reference architecture, with Mojaloop as the hub: the interoperability key. Integrated with Tazama FRMS so payments clearing through it can be checked for fraud.',
    role: 'Integrating the clearing house with Tazama FRMS.',
    flow: ['Providers', 'Mojaloop hub', 'Integration', 'Tazama', 'Alerts'],
    lede:
      'The COMESA Clearing House is built on the Mojaloop reference architecture, and Mojaloop is the hub: the interoperability key that lets different payment providers send money to each other. Mojaloop is open-source software for inclusive instant payment systems.',
    stack: ['Mojaloop', 'Tazama FRMS', 'ISO 20022'],
    stats: [
      {
        value: '500',
        label: 'messages replayed as a regression check before any change ships.',
      },
      {
        value: '21',
        label: 'African member states in COMESA, the common market behind the clearing house.',
        source: { label: 'comesa.int', href: 'https://www.comesa.int/' },
      },
    ],
    stages: [
      {
        name: 'Payment providers',
        detail: 'Each payment provider connects once, to the hub, instead of to every other provider.',
      },
      {
        name: 'Discovery',
        detail: 'The hub looks up who the payee is and which provider holds their account.',
      },
      {
        name: 'Agreement',
        detail: "The payer's and payee's providers agree on the terms of the transfer before any money moves.",
      },
      {
        name: 'Transfer',
        detail: 'The transfer clears through the hub, so both providers see the same outcome.',
      },
      {
        name: 'Fraud evaluation',
        detail: "The integration passes the payment to Tazama, which runs it through its rules and typologies and raises an alert when something looks wrong.",
      },
    ],
    strengths: [
      'Mojaloop is the hub, the interoperability key: one hub, shared rules, many providers.',
      'A brilliant example of backend engineering: a payments hub and a real-time fraud engine working as one system.',
      'Both foundations are open source: Mojaloop and Tazama.',
    ],
    part: [
      "I worked on integrating the COMESA Clearing House with Tazama FRMS: connecting a Mojaloop-based payments hub, the interoperability key, to Tazama's real-time fraud pipeline, so the payments that clear through the hub are evaluated for fraud.",
    ],
    links: [
      { label: 'Tazama FRMS, the fraud engine', href: '/projects/tazama' },
      { label: 'mojaloop.io', href: 'https://mojaloop.io/' },
    ],
  },
];
