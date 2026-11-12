# Demo data

This HTML uses historical **demonstration data**, not a live analytics connection. It contains the seven records from 2026-10-23 through 2026-10-29, in Asia/Shanghai time. The last day is partial.

The source is the existing `mobile.html` demonstration fixture, captured as `mobile-growth-last7-days.json` in the FansAI Growth prototype. Its `hist` records are converted to named fields in `data.js`. Currency values are rounded to two decimal places on conversion, then summed as integer cents. Download counts are integers.

## Definitions

- Revenue: gross income, all users (`gross`).
- Marketing: channel marketing spend (`mkt`).
- Compute: channel compute spend (`cc`).
- Cost = marketing + compute.
- Profit = revenue − cost.
- ROI = revenue ÷ cost × 100. A zero cost denominator gives `null`, displayed as `—`.
- CPI = marketing ÷ downloads. Zero downloads gives `null`, displayed as `—`.
- Summary ROI and CPI use sums before division. Daily ratios are not averaged to produce an overall ratio.
- Profitable-day count, ROI high/low, daily average and peak-day statistics exclude the partial day. Range totals include it.

## Snapshot differences

The selected reference images are visual concepts. Their headline summary snapshot is not the same as the captured daily fixture. The interactive HTML deliberately computes its headline from the plotted records instead of forcing the illustration's summary into the data.

The seven available days total:

| Metric | USD |
|---|---:|
| Revenue | 36,725.48 |
| Marketing | 28,438.51 |
| Compute | 5,127.86 |
| Total cost | 33,566.37 |
| Profit | +3,159.11 |

The seven days contain 17,524 downloads. Four of the six complete days are profitable. The highest complete-day ROI is 128.7769% on 10/23; the lowest is 82.5836% on 10/27.

`selectRange('month')` returns only the available records in the current fixture month. It does not invent the missing dates. The UI should label this as available data if it exposes a month option.

## Browser interface

Load `data.js` as a classic script before the chart script. It works without a network request or an HTTP server.

```js
const days = FansAIData.selectRange('week');
const summary = FansAIData.summarize(days, 'all');
const points = FansAIData.series(days, 'apple');
const stats = FansAIData.completedStats(days, 'all');
```

`FANSAI_DATA` exposes `meta`, `channels` (`id`, `label`, `color`) and `days`. A day exposes `date`, `partial` and `channels`, whose values contain `revenue`, `marketing`, `compute` and `downloads`.

`completedStats` returns `completedDays`, `profitableDays`, `highestROI`, `lowestROI`, `averageMarketing` and `highestMarketing`. The highest/lowest objects are `{date, value}`; unavailable statistics are `null`.

Run the standalone arithmetic and boundary checks with `node tests/data.test.cjs`.
