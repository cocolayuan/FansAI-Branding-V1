/* Local, dependency-free filter sheet. No native date-picker popup. */
(function () {
  'use strict';

  const FIRST = '2026-10-23';
  const LAST = '2026-10-29';
  const defaults = { period: 'week', channel: 'all', start: FIRST, end: LAST };
  const channels = { all: '全部渠道', organic: '自然渠道', apple: 'Apple Ads', meta: 'Meta', tiktok: 'TikTok' };
  const periods = { today: '今天', week: '近 7 天', month: '本月', custom: '自定义' };
  const chevron = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>';
  const calendarIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="16" rx="3"/><path d="M8 3v4m8-4v4M4 10h16"/></svg>';
  let state = { ...defaults };
  let draft = { ...state };
  let dialog;
  let returnFocus;
  let calendarTarget = null;
  let previousOverflow = '';

  function initialize() {
    if (dialog) return;
    dialog = document.createElement('dialog');
    dialog.id = 'filterDialog';
    dialog.setAttribute('aria-labelledby', 'filterTitle');
    dialog.innerHTML = `
      <form class="filter-form">
        <header class="filter-header">
          <h2 id="filterTitle">看板筛选</h2>
          <button type="button" class="filter-cancel" data-filter-cancel>取消</button>
        </header>
        <div class="filter-content">
          <fieldset class="filter-fieldset">
            <legend>时间</legend>
            <div class="filter-periods" role="group" aria-label="时间范围">
              ${['today', 'week', 'month'].map(key => `<button type="button" data-filter-period="${key}" aria-pressed="false">${periods[key]}</button>`).join('')}
            </div>
          </fieldset>
          <details class="filter-date-details">
            <summary>自定义日期<span class="filter-detail-summary" id="filterDateSummary"></span>${chevron}</summary>
            <div class="filter-dates">
              <div><span class="filter-date-label">开始日期</span><button type="button" id="filterStart" data-calendar="start" aria-expanded="false" aria-controls="filterCalendar"></button></div>
              <div><span class="filter-date-label">结束日期</span><button type="button" id="filterEnd" data-calendar="end" aria-expanded="false" aria-controls="filterCalendar"></button></div>
            </div>
            <section id="filterCalendar" class="filter-calendar" hidden aria-label="选择日期">
              <div class="filter-calendar-title"><strong>2026 年 10 月</strong><button type="button" data-calendar-close aria-label="关闭日历">收起</button></div>
              <div class="filter-weekdays" aria-hidden="true"><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span><span>日</span></div>
              <div class="filter-day-grid" role="group" aria-label="2026 年 10 月"></div>
            </section>
          </details>
          <details class="filter-channels">
            <summary><strong>渠道</strong><span class="filter-channel-value">全部渠道</span>${chevron}</summary>
            <div class="filter-channel-options" role="group" aria-label="渠道">
              ${Object.entries(channels).map(([key, name]) => `<button type="button" data-filter-channel="${key}" aria-pressed="false">${name}<span aria-hidden="true">✓</span></button>`).join('')}
            </div>
          </details>
        </div>
        <footer class="filter-footer">
          <button type="button" class="filter-reset">重置</button>
          <button type="submit" class="filter-apply">应用筛选</button>
        </footer>
      </form>`;
    document.body.appendChild(dialog);

    dialog.querySelector('form').addEventListener('submit', event => {
      event.preventDefault();
      state = { ...draft };
      close();
      window.dispatchEvent(new CustomEvent('fansai:filters', { detail: { ...state } }));
    });
    dialog.querySelector('[data-filter-cancel]').addEventListener('click', close);
    dialog.querySelector('.filter-reset').addEventListener('click', () => {
      draft = { ...defaults };
      closeCalendar(false);
      render();
    });
    dialog.querySelectorAll('[data-filter-period]').forEach(button => button.addEventListener('click', () => {
      draft.period = button.dataset.filterPeriod;
      draft.start = draft.period === 'today' ? LAST : FIRST;
      draft.end = LAST;
      closeCalendar(false);
      render();
    }));
    dialog.querySelectorAll('[data-filter-channel]').forEach(button => button.addEventListener('click', () => {
      draft.channel = button.dataset.filterChannel;
      render();
    }));
    dialog.querySelectorAll('[data-calendar]').forEach(button => button.addEventListener('click', () => {
      if (calendarTarget === button.dataset.calendar) closeCalendar(true);
      else openCalendar(button.dataset.calendar);
    }));
    dialog.querySelector('[data-calendar-close]').addEventListener('click', () => closeCalendar(true));
    dialog.querySelector('.filter-date-details').addEventListener('toggle', event => {
      if (!event.currentTarget.open) closeCalendar(false);
    });
    dialog.addEventListener('cancel', event => {
      if (calendarTarget) {
        event.preventDefault();
        closeCalendar(true);
      }
    });
    dialog.addEventListener('close', () => {
      closeCalendar(false);
      draft = { ...state };
      document.documentElement.style.overflow = previousOverflow;
      if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    });
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const box = dialog.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) close();
    });
    ['openFilters', 'periodButton', 'channelButton'].forEach(id => {
      const trigger = document.getElementById(id);
      if (!trigger) return;
      trigger.setAttribute('aria-haspopup', 'dialog');
      trigger.setAttribute('aria-controls', 'filterDialog');
      trigger.addEventListener('click', () => open(id === 'channelButton' ? 'channel' : 'period'));
    });
    render();
  }

  function open(section) {
    initialize();
    if (dialog.open) return;
    draft = { ...state };
    returnFocus = document.activeElement;
    dialog.querySelector('.filter-channels').open = section === 'channel';
    dialog.querySelector('.filter-date-details').open = draft.period === 'custom';
    render();
    previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    dialog.showModal();
    const focus = section === 'channel' ? dialog.querySelector(`[data-filter-channel="${draft.channel}"]`) : dialog.querySelector(`[data-filter-period="${draft.period === 'custom' ? 'week' : draft.period}"]`);
    focus?.focus({ preventScroll: true });
  }

  function close() {
    if (dialog?.open) dialog.close();
  }

  function render() {
    dialog.querySelectorAll('[data-filter-period]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filterPeriod === draft.period)));
    dialog.querySelectorAll('[data-filter-channel]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filterChannel === draft.channel)));
    dialog.querySelector('.filter-channel-value').textContent = channels[draft.channel];
    dialog.querySelector('#filterStart').innerHTML = `<span>${draft.start.replaceAll('-', '/')}</span>${calendarIcon}`;
    dialog.querySelector('#filterEnd').innerHTML = `<span>${draft.end.replaceAll('-', '/')}</span>${calendarIcon}`;
    dialog.querySelector('#filterStart').setAttribute('aria-label', `开始日期 ${draft.start}`);
    dialog.querySelector('#filterEnd').setAttribute('aria-label', `结束日期 ${draft.end}`);
    dialog.querySelector('#filterDateSummary').textContent = draft.period === 'custom' ? `${draft.start.slice(5)} — ${draft.end.slice(5)}` : '';
    if (calendarTarget) renderCalendar();
  }

  function openCalendar(target) {
    calendarTarget = target;
    dialog.querySelector('#filterCalendar').hidden = false;
    dialog.querySelectorAll('[data-calendar]').forEach(button => button.setAttribute('aria-expanded', String(button.dataset.calendar === target)));
    renderCalendar();
    const selected = dialog.querySelector(`[data-date="${draft[target]}"]`);
    selected?.focus({ preventScroll: true });
  }

  function closeCalendar(restoreFocus) {
    if (!dialog) return;
    const previous = calendarTarget;
    calendarTarget = null;
    dialog.querySelector('#filterCalendar').hidden = true;
    dialog.querySelectorAll('[data-calendar]').forEach(button => button.setAttribute('aria-expanded', 'false'));
    if (restoreFocus && previous) dialog.querySelector(`[data-calendar="${previous}"]`).focus({ preventScroll: true });
  }

  function renderCalendar() {
    const grid = dialog.querySelector('.filter-day-grid');
    const monthStart = new Date(Date.UTC(2026, 9, 1));
    const offset = (monthStart.getUTCDay() + 6) % 7;
    let markup = '<span aria-hidden="true"></span>'.repeat(offset);
    for (let day = 1; day <= 31; day++) {
      const date = `2026-10-${String(day).padStart(2, '0')}`;
      const disabled = date < FIRST || date > LAST;
      const selected = date === draft[calendarTarget];
      const inRange = date >= draft.start && date <= draft.end;
      markup += `<button type="button" data-date="${date}" ${disabled ? 'disabled' : ''} class="${inRange ? 'filter-day-in-range' : ''}" aria-label="2026 年 10 月 ${day} 日" aria-pressed="${selected}" tabindex="${selected && !disabled ? '0' : '-1'}">${day}</button>`;
    }
    grid.innerHTML = markup;
    grid.querySelectorAll('button:not(:disabled)').forEach(button => {
      button.addEventListener('click', () => {
        const target = calendarTarget;
        draft[target] = button.dataset.date;
        if (draft.start > draft.end) {
          if (target === 'start') draft.end = draft.start;
          else draft.start = draft.end;
        }
        draft.period = 'custom';
        closeCalendar(true);
        render();
      });
      button.addEventListener('keydown', event => {
        const shifts = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
        const current = Number(button.dataset.date.slice(-2));
        let targetDay;
        if (event.key in shifts) targetDay = Math.max(23, Math.min(29, current + shifts[event.key]));
        else if (event.key === 'Home') targetDay = 23;
        else if (event.key === 'End') targetDay = 29;
        else return;
        event.preventDefault();
        const next = grid.querySelector(`[data-date="2026-10-${targetDay}"]`);
        grid.querySelectorAll('button').forEach(item => item.tabIndex = -1);
        next.tabIndex = 0;
        next.focus();
      });
    });
  }

  window.FansAIFilters = { open, close, getState: () => ({ ...state }) };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
