/**
 * Fixtures for the Teams UI slice. There is no relay and no keypair yet, so
 * every value here is invented and none of it leaves the renderer.
 */
import type { IncomingRequest, Org, Teammate, ThreadMessage } from './types';

export const MOCK_ORG: Org = {
  name: 'Dunder Mifflin Scranton',
  seatsUsed: 6,
  seats: 10,
  defaultLevel: 'communication-only'
};

export const MOCK_SELF: Teammate = {
  id: 'self',
  name: 'You',
  machine: "Chaitanya's MacBook Pro",
  presence: 'online',
  theyAllow: 'communication-only',
  youAllow: 'communication-only',
  fingerprint: '4A7F 2C19 88BE 03D5 F16A 9C42',
  verified: true,
  isSelf: true
};

export const MOCK_TEAMMATES: Teammate[] = [
  {
    id: 'pam', name: 'Pam Beesly', bossName: 'Scott', machine: "Pam's Mac", presence: 'online',
    theyAllow: 'allow-all', youAllow: 'allow-all', overridden: true,
    fingerprint: 'B213 7E90 4CA6 D8F1 2035 6BE7', verified: true
  },
  {
    id: 'kevin', name: 'Kevin Malone', bossName: 'Cookie', machine: "Kevin's ThinkPad", presence: 'offline',
    theyAllow: 'communication-only', youAllow: 'communication-only',
    fingerprint: '90C4 18AF 27D3 E5B0 7A96 1F28', verified: true
  },
  {
    id: 'ryan', name: 'Ryan Howard', machine: "Ryan's MacBook Air", presence: 'online',
    theyAllow: 'strict', youAllow: 'communication-only',
    fingerprint: '3E81 D62C 04F7 9AB5 C138 5D40', verified: false
  },
  {
    id: 'angela', name: 'Angela Martin', bossName: 'Sprinkles', machine: "Angela's iMac", presence: 'offline',
    theyAllow: 'communication-only', youAllow: 'strict', overridden: true,
    fingerprint: 'CF05 93B7 1A2E 68D4 B70C 41F9', verified: true
  },
  {
    id: 'oscar', name: 'Oscar Martinez', machine: "Oscar's MacBook Pro", presence: 'online',
    theyAllow: 'communication-only', youAllow: 'communication-only',
    // Reinstalled: the key on record no longer matches. Drives D13.
    fingerprint: '7B4D 2019 F3C8 A56E 0D27 94B1',
    previousFingerprint: '7B4D 2019 F3C8 A56E 0D27 11C3',
    verified: false
  }
];

export const MOCK_REQUESTS: IncomingRequest[] = [
  {
    id: 'r1', fromName: 'Pam Beesly', fromMachine: "Pam's Mac",
    preview: 'Review the export dialog spacing',
    detail: 'Run a visual pass over the export dialog at 1280 and 1440 and report anything off the 4px scale.',
    at: '14:02'
  },
  {
    id: 'r2', fromName: 'Kevin Malone', fromMachine: "Kevin's ThinkPad",
    preview: 'Take the failing migration test',
    detail: 'test/migrate-0-4-6.test.cjs fails on a fresh profile. Reproduce and find the cause, do not fix it yet.',
    at: '13:47'
  },
  {
    id: 'r3', fromName: 'Ryan Howard', fromMachine: "Ryan's MacBook Air",
    preview: 'Pull this week’s activation numbers',
    detail: 'Daily actives for the last 14 days, split by platform.',
    at: '11:20', expired: true
  }
];

export const MOCK_THREAD: ThreadMessage[] = [
  {
    id: 'm1', from: 'pam', at: '13:58', delivery: 'delivered',
    body: 'Michael, can your side take the export dialog spacing pass? Mine is deep in the icon set.'
  },
  {
    id: 'm2', from: 'you', at: '13:59', delivery: 'delivered',
    body: 'Taking it. I will put Kevin on the measurement and Pam on the write up.',
    pickedUpBy: [
      { name: 'Kevin', status: 'working' },
      { name: 'Pam', status: 'thinking' }
    ]
  },
  {
    id: 'm3', from: 'pam', at: '14:02', delivery: 'delivered',
    body: 'Perfect. The 1440 pass is the one I care about.'
  },
  {
    id: 'm4', from: 'you', at: '14:06', delivery: 'sending',
    body: 'First pass is done. Two gaps off the scale, both in the footer.'
  }
];
