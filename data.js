/* FansAI demo fixture. Dollars are stored to 2 decimals; sums use integer cents.
 * See data-notes.md for provenance, definitions and coverage. */
(function (root) {
  'use strict';
  const fixture = {
  "meta": {
    "demo": true,
    "source": "mobile.html historical demo fixture",
    "sourceFile": "mobile-growth-last7-days.json",
    "currency": "USD",
    "incomeBasis": "gross",
    "userScope": "all",
    "timezone": "Asia/Shanghai",
    "start": "2026-10-23",
    "end": "2026-10-29",
    "partialDate": "2026-10-29",
    "granularity": "day"
  },
  "channels": [
    {
      "id": "organic",
      "label": "自然渠道",
      "color": "#00B99E"
    },
    {
      "id": "apple",
      "label": "Apple Ads",
      "color": "#4A7EE8"
    },
    {
      "id": "meta",
      "label": "Meta",
      "color": "#C4F56D"
    },
    {
      "id": "tiktok",
      "label": "TikTok",
      "color": "#C8DDFF"
    }
  ],
  "days": [
    {
      "date": "2026-10-23",
      "partial": false,
      "channels": {
        "organic": {
          "revenue": 4687.45,
          "marketing": 0,
          "compute": 330.22,
          "downloads": 1183
        },
        "apple": {
          "revenue": 1630.13,
          "marketing": 1457.76,
          "compute": 352.1,
          "downloads": 947
        },
        "meta": {
          "revenue": 706.44,
          "marketing": 3202.73,
          "compute": 111.6,
          "downloads": 341
        },
        "tiktok": {
          "revenue": 0,
          "marketing": 0,
          "compute": 0,
          "downloads": 0
        }
      }
    },
    {
      "date": "2026-10-24",
      "partial": false,
      "channels": {
        "organic": {
          "revenue": 2045.91,
          "marketing": 0,
          "compute": 405.27,
          "downloads": 1363
        },
        "apple": {
          "revenue": 2258.54,
          "marketing": 1981.09,
          "compute": 313.53,
          "downloads": 1171
        },
        "meta": {
          "revenue": 1085.54,
          "marketing": 2602.67,
          "compute": 174.2,
          "downloads": 434
        },
        "tiktok": {
          "revenue": 0,
          "marketing": 0,
          "compute": 0,
          "downloads": 0
        }
      }
    },
    {
      "date": "2026-10-25",
      "partial": false,
      "channels": {
        "organic": {
          "revenue": 1867.65,
          "marketing": 0,
          "compute": 313.0,
          "downloads": 1362
        },
        "apple": {
          "revenue": 1538.15,
          "marketing": 2041.62,
          "compute": 298.55,
          "downloads": 1202
        },
        "meta": {
          "revenue": 2724.23,
          "marketing": 2626.5,
          "compute": 130.35,
          "downloads": 571
        },
        "tiktok": {
          "revenue": 56.61,
          "marketing": 0,
          "compute": 1.06,
          "downloads": 0
        }
      }
    },
    {
      "date": "2026-10-26",
      "partial": false,
      "channels": {
        "organic": {
          "revenue": 1671.44,
          "marketing": 0,
          "compute": 314.98,
          "downloads": 1310
        },
        "apple": {
          "revenue": 1861.9,
          "marketing": 1586.7,
          "compute": 340.48,
          "downloads": 1107
        },
        "meta": {
          "revenue": 485.22,
          "marketing": 1500.27,
          "compute": 128.23,
          "downloads": 257
        },
        "tiktok": {
          "revenue": 105.53,
          "marketing": 0,
          "compute": 0.99,
          "downloads": 0
        }
      }
    },
    {
      "date": "2026-10-27",
      "partial": false,
      "channels": {
        "organic": {
          "revenue": 2015.23,
          "marketing": 0,
          "compute": 354.02,
          "downloads": 884
        },
        "apple": {
          "revenue": 1850.53,
          "marketing": 1838.57,
          "compute": 279.84,
          "downloads": 1367
        },
        "meta": {
          "revenue": 722.0,
          "marketing": 2999.51,
          "compute": 83.35,
          "downloads": 323
        },
        "tiktok": {
          "revenue": 0,
          "marketing": 0,
          "compute": 0,
          "downloads": 0
        }
      }
    },
    {
      "date": "2026-10-28",
      "partial": false,
      "channels": {
        "organic": {
          "revenue": 3078.34,
          "marketing": 0,
          "compute": 244.94,
          "downloads": 838
        },
        "apple": {
          "revenue": 2782.43,
          "marketing": 1183.56,
          "compute": 498.76,
          "downloads": 1260
        },
        "meta": {
          "revenue": 871.64,
          "marketing": 3470.64,
          "compute": 95.7,
          "downloads": 375
        },
        "tiktok": {
          "revenue": 0,
          "marketing": 0,
          "compute": 0,
          "downloads": 0
        }
      }
    },
    {
      "date": "2026-10-29",
      "partial": true,
      "channels": {
        "organic": {
          "revenue": 941.02,
          "marketing": 0,
          "compute": 177.59,
          "downloads": 453
        },
        "apple": {
          "revenue": 1265.99,
          "marketing": 548.35,
          "compute": 115.69,
          "downloads": 637
        },
        "meta": {
          "revenue": 473.56,
          "marketing": 1398.54,
          "compute": 63.41,
          "downloads": 139
        },
        "tiktok": {
          "revenue": 0,
          "marketing": 0,
          "compute": 0,
          "downloads": 0
        }
      }
    }
  ]
};

  const channelIds = fixture.channels.map(channel => channel.id);
  const cents = value => Math.round(Number(value) * 100);
  const dollars = value => value / 100;

  function normalizeDays(days) {
    if (days == null) return fixture.days;
    if (!Array.isArray(days)) throw new TypeError('days must be an array');
    return days;
  }

  function summarize(days, channel = 'all') {
    const keys = channel === 'all' ? channelIds : [channel];
    if (keys.some(key => !channelIds.includes(key))) throw new RangeError('Unknown channel: ' + channel);
    let revenueCents = 0, marketingCents = 0, computeCents = 0, downloads = 0;
    for (const day of normalizeDays(days)) {
      for (const key of keys) {
        const row = day.channels[key];
        if (!row) continue;
        revenueCents += cents(row.revenue);
        marketingCents += cents(row.marketing);
        computeCents += cents(row.compute);
        downloads += row.downloads;
      }
    }
    const costCents = marketingCents + computeCents;
    return {
      revenue: dollars(revenueCents), marketing: dollars(marketingCents), compute: dollars(computeCents),
      cost: dollars(costCents), profit: dollars(revenueCents - costCents),
      roi: costCents > 0 ? revenueCents / costCents * 100 : null,
      cpi: downloads > 0 ? dollars(marketingCents) / downloads : null,
      downloads
    };
  }

  function selectRange(period = 'week') {
    const end = fixture.meta.end;
    if (period === 'today') return fixture.days.filter(day => day.date === end);
    if (period === 'week') {
      const start = new Date(Date.parse(end + 'T00:00:00Z') - 6 * 86400000).toISOString().slice(0, 10);
      return fixture.days.filter(day => day.date >= start && day.date <= end);
    }
    // This fixture only contains seven days. Month returns available records,
    // never fabricated dates or a padded zero-filled monthly history.
    if (period === 'month') return fixture.days.filter(day => day.date.slice(0, 7) === end.slice(0, 7));
    if (period === 'all') return fixture.days.slice();
    throw new RangeError('Unknown period: ' + period);
  }

  function series(days, channel = 'all') {
    return normalizeDays(days).map(day => ({date: day.date, partial: day.partial, ...summarize([day], channel)}));
  }

  function completedStats(days, channel = 'all') {
    const complete = series(days, channel).filter(day => !day.partial);
    const ratios = complete.filter(day => Number.isFinite(day.roi));
    const maxROI = ratios.reduce((best, day) => !best || day.roi > best.roi ? day : best, null);
    const minROI = ratios.reduce((best, day) => !best || day.roi < best.roi ? day : best, null);
    const maxMarketing = complete.reduce((best, day) => !best || day.marketing > best.marketing ? day : best, null);
    return {
      completedDays: complete.length,
      profitableDays: complete.filter(day => day.profit > 0).length,
      highestROI: maxROI ? {date: maxROI.date, value: maxROI.roi} : null,
      lowestROI: minROI ? {date: minROI.date, value: minROI.roi} : null,
      averageMarketing: complete.length ? dollars(complete.reduce((sum, day) => sum + cents(day.marketing), 0)) / complete.length : null,
      highestMarketing: maxMarketing ? {date: maxMarketing.date, value: maxMarketing.marketing} : null
    };
  }

  root.FANSAI_DATA = fixture;
  root.FansAIData = Object.freeze({summarize, selectRange, series, completedStats});
})(typeof window !== 'undefined' ? window : globalThis);
