'use strict';
const assert = require('node:assert/strict');
require('../data.js');

const {summarize, selectRange, series, completedStats} = globalThis.FansAIData;
const fixture = globalThis.FANSAI_DATA;
const near = (actual, expected, epsilon = 1e-8) => assert.ok(Math.abs(actual - expected) < epsilon, `${actual} != ${expected}`);
let checks = 0;
function test(name, fn) { fn(); checks++; console.log(`PASS ${name}`); }

test('Fixture is explicitly demo with seven available dates and a partial last day', () => {
  assert.equal(fixture.meta.demo, true);
  assert.equal(fixture.days.length, 7);
  assert.equal(fixture.days[0].date, '2026-10-23');
  assert.equal(fixture.days.at(-1).date, '2026-10-29');
  assert.equal(fixture.days.filter(day => day.partial).length, 1);
  assert.equal(fixture.days.at(-1).partial, true);
});

test('Each daily aggregate matches the captured source summary', () => {
  const expected = [
    [7024.02, 4660.49, 793.92, 5454.41, 1569.61],
    [5389.99, 4583.76, 893.00, 5476.76, -86.77],
    [6186.64, 4668.12, 742.96, 5411.08, 775.56],
    [4124.09, 3086.97, 784.68, 3871.65, 252.44],
    [4587.76, 4838.08, 717.21, 5555.29, -967.53],
    [6732.41, 4654.20, 839.40, 5493.60, 1238.81],
    [2680.57, 1946.89, 356.69, 2303.58, 376.99]
  ];
  series(selectRange('week')).forEach((day, i) => {
    ['revenue', 'marketing', 'compute', 'cost', 'profit'].forEach((key, j) => assert.equal(day[key], expected[i][j]));
    near(day.roi, day.revenue / day.cost * 100);
  });
});

test('Week totals use all seven records and ratios of sums', () => {
  const total = summarize(selectRange('week'));
  assert.equal(total.revenue, 36725.48);
  assert.equal(total.marketing, 28438.51);
  assert.equal(total.compute, 5127.86);
  assert.equal(total.cost, 33566.37);
  assert.equal(total.profit, 3159.11);
  assert.equal(total.downloads, 17524);
  near(total.roi, 36725.48 / 33566.37 * 100);
  near(total.cpi, 28438.51 / 17524);
});

test('Channel totals reconcile with all-channel totals exactly in cents', () => {
  const week = selectRange('week');
  const total = summarize(week);
  for (const key of ['revenue', 'marketing', 'compute', 'cost', 'profit']) {
    const channelCents = fixture.channels.reduce((sum, channel) => sum + Math.round(summarize(week, channel.id)[key] * 100), 0);
    assert.equal(channelCents, Math.round(total[key] * 100));
  }
});

test('Complete-day statistics exclude the partial day', () => {
  const stats = completedStats(selectRange('week'));
  assert.equal(stats.completedDays, 6);
  assert.equal(stats.profitableDays, 4);
  assert.equal(stats.highestROI.date, '2026-10-23');
  assert.equal(stats.lowestROI.date, '2026-10-27');
  near(stats.highestROI.value, 128.77689795963266);
  near(stats.lowestROI.value, 82.58362749739439);
  assert.deepEqual(stats.highestMarketing, {date: '2026-10-27', value: 4838.08});
  near(stats.averageMarketing, (28438.51 - 1946.89) / 6);
  assert.equal(completedStats(selectRange('today')).highestROI, null);
  assert.equal(completedStats(selectRange('today')).averageMarketing, null);
});

test('Zero denominators and empty ranges remain missing ratios rather than Infinity', () => {
  const todayTikTok = summarize(selectRange('today'), 'tiktok');
  assert.equal(todayTikTok.roi, null);
  assert.equal(todayTikTok.cpi, null);
  assert.equal(todayTikTok.profit, 0);
  const empty = summarize([]);
  assert.equal(empty.revenue, 0);
  assert.equal(empty.roi, null);
  assert.equal(empty.cpi, null);
});

test('Month selection does not fabricate missing dates, and unknown filters fail', () => {
  assert.equal(selectRange('month').length, 7);
  assert.equal(selectRange('today').length, 1);
  assert.throws(() => selectRange('unknown'), RangeError);
  assert.throws(() => summarize(selectRange(), 'unknown'), RangeError);
});

console.log(`${checks} data checks passed.`);
