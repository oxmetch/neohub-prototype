(() => {
  'use strict';

  const W = 390;
  const stage = document.getElementById('stage');
  const device = document.getElementById('device');
  let scale = 1;

  // ---------- Масштаб под экран ----------
  function layout() {
    if (window.innerWidth >= 600) {
      scale = 1;
      stage.style.transform = '';
      stage.style.height = '844px';
      device.style.setProperty('--fit', Math.min(1, (window.innerHeight - 48) / 868).toFixed(3));
    } else {
      // В режиме приложения iOS иногда отдаёт innerHeight без полоски внизу —
      // тогда берём полную высоту экрана
      const h = isStandalone() ? Math.max(window.innerHeight, screen.height) : window.innerHeight;
      document.documentElement.style.height = document.body.style.height = device.style.height = `${h}px`;
      scale = window.innerWidth / W;
      stage.style.transform = `scale(${scale})`;
      stage.style.height = `${h / scale}px`;
    }
  }
  function isStandalone() {
    return window.navigator.standalone || matchMedia('(display-mode: standalone)').matches;
  }
  window.addEventListener('resize', layout);
  layout();

  // ---------- Утилиты ----------
  const screenEl = (id) => document.getElementById('s-' + id);
  const box = (el) => {
    const r = el.getBoundingClientRect();
    const s = stage.getBoundingClientRect();
    const k = s.width / W;
    return { w: r.width / k, h: r.height / k, top: (r.top - s.top) / k, left: (r.left - s.left) / k };
  };
  const leafText = (el) => el.textContent.replace(/\s+/g, ' ').trim();

  function findTexts(root, text) {
    const re = text instanceof RegExp ? text : null;
    const out = [];
    root.querySelectorAll('div, span').forEach((el) => {
      if (el.querySelector('div')) return;
      const t = leafText(el);
      if (re ? re.test(t) : t === text) out.push(el);
    });
    return out;
  }

  const sameLook = (a, b) =>
    a.tagName === b.tagName &&
    (a.getAttribute('style') || '').replace(/(background-color|border-color|color): [^;]+;?/g, '') ===
      (b.getAttribute('style') || '').replace(/(background-color|border-color|color): [^;]+;?/g, '');

  // Поднимаемся от текста к «кнопке»: до самого большого предка,
  // который ещё не список однотипных элементов и не содержит чужих целей.
  function clickable(el, screen, opts, otherTexts) {
    if (opts.up != null) {
      for (let i = 0; i < opts.up; i++) el = el.parentElement;
      return el;
    }
    const maxH = opts.maxH || 110;
    let cur = el;
    for (let i = 0; i < 6; i++) {
      const p = cur.parentElement;
      if (!p || p.parentElement === screen || p === screen) break;
      const b = box(p);
      if (b.h > maxH || b.w > (opts.wide ? 391 : 385)) break;
      const kids = [...p.children].filter((k) => k.tagName === 'DIV');
      if (kids.length > 1 && kids.some((k, j) => kids.slice(j + 1).some((m) => sameLook(k, m) && k.children.length))) break;
      const pt = leafText(p);
      const own = typeof opts._text === 'string' ? opts._text : '';
      if (otherTexts.some((t) => typeof t === 'string' && t !== own && !own.includes(t) && pt.includes(t))) break;
      cur = p;
    }
    return cur;
  }

  // ---------- Навигация ----------
  const stack = [];
  let busy = false;
  const enterHooks = {};
  const prepared = new Set();

  function show(id, mode) {
    const next = screenEl(id);
    const prev = stack.length ? screenEl(stack[stack.length - 1]) : null;
    if (!next || next === prev) return;
    next.hidden = false;
    // фон страницы под цвет экрана — на случай зазоров у краёв
    document.body.style.background = getComputedStyle(next.firstElementChild).backgroundColor;
    prepare(id);
    if (enterHooks[id]) enterHooks[id](next);
    if (!prev || mode === 'none') {
      if (prev) prev.hidden = true;
      return;
    }
    busy = true;
    const inCls = 'enter-' + mode, outCls = 'leave-' + mode;
    next.classList.add(inCls);
    prev.classList.add(outCls);
    setTimeout(() => {
      next.classList.remove(inCls);
      prev.classList.remove(outCls);
      prev.hidden = true;
      busy = false;
    }, mode === 'fade' ? 360 : 350);
  }

  function go(id, mode = 'push') {
    if (busy) return;
    show(id, mode);
    stack.push(id);
  }
  function reset(id, mode = 'fade') {
    if (busy) return;
    show(id, mode);
    stack.length = 0;
    stack.push(id);
  }
  function back() {
    if (busy || stack.length < 2) return;
    const target = stack[stack.length - 2];
    show(target, 'pop');
    stack.pop();
  }

  // ---------- Оверлеи ----------
  const faceidEl = document.getElementById('faceid');
  function faceId(done, label = 'Face ID') {
    const b = faceidEl.querySelector('.faceid-box');
    faceidEl.querySelector('.faceid-label').textContent = label;
    b.classList.remove('ok');
    faceidEl.hidden = false;
    setTimeout(() => b.classList.add('ok'), label === 'Face ID' ? 900 : 1600);
    setTimeout(() => { faceidEl.hidden = true; done(); }, label === 'Face ID' ? 1500 : 2200);
  }

  const toastEl = document.getElementById('toast');
  let toastTimer;
  function toast(text) {
    toastEl.textContent = text;
    toastEl.hidden = false;
    toastEl.style.animation = 'none';
    void toastEl.offsetWidth;
    toastEl.style.animation = '';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.hidden = true; }, 2200);
  }

  // Push-уведомление сверху
  function notify(title, text, onTap) {
    const n = document.createElement('div');
    n.className = 'push';
    n.innerHTML = `<div class="push-icon">U</div><div class="push-body"><div class="push-head"><b>${title}</b><span>сейчас</span></div><div>${text}</div></div>`;
    device.appendChild(n);
    const close = () => { n.classList.add('out'); setTimeout(() => n.remove(), 300); };
    n.addEventListener('click', () => { close(); onTap && onTap(); });
    setTimeout(close, 6000);
  }

  // Чекбокс 20×20 рядом с текстом согласия
  function checkbox(row) {
    const sel = 'div[style*="height: 20px"][style*="width: 20px"]';
    const cb = row.querySelector(sel) || row.parentElement.querySelector(sel);
    if (!cb) return;
    const on = cb.dataset.on !== '1';
    cb.dataset.on = on ? '1' : '';
    cb.style.backgroundColor = on ? '#00AB76' : '#FFFFFF';
    cb.style.borderColor = on ? '#00AB76' : '#B1B2B7';
    cb.style.display = 'flex';
    cb.style.alignItems = 'center';
    cb.style.justifyContent = 'center';
    cb.innerHTML = on ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>' : '';
  }

  // Выбор одного из соседних вариантов (сегменты, чипсы, тарифы):
  // меняем местами оформление нажатого и текущего выбранного
  function select(el) {
    const group = el.parentElement;
    const sibs = [...group.children];
    if (group.dataset.sel == null) {
      // изначально выбран элемент с уникальным оформлением, а в паре — первый
      const opts = sibs.filter((s) => s.childElementCount === el.childElementCount);
      const style = (s) => s.getAttribute('style');
      const uniq = opts.find((s) => opts.filter((o) => style(o) === style(s)).length === 1);
      group.dataset.sel = sibs.indexOf(opts.length > 2 && uniq ? uniq : opts[0]);
    }
    const cur = sibs[+group.dataset.sel];
    if (!cur || cur === el) return;
    const swap = (a, b) => {
      const s = a.getAttribute('style');
      a.setAttribute('style', b.getAttribute('style'));
      b.setAttribute('style', s);
    };
    swap(cur, el);
    const ca = [...cur.children], ea = [...el.children];
    for (let i = 0; i < Math.min(ca.length, ea.length); i++) {
      if (ca[i].tagName !== ea[i].tagName || ca[i].childElementCount !== ea[i].childElementCount) continue;
      if (i === 0 && !leafText(ca[i]) && !leafText(ea[i])) {
        const h = ca[i].innerHTML; ca[i].innerHTML = ea[i].innerHTML; ea[i].innerHTML = h;
      }
      swap(ca[i], ea[i]);
    }
    group.dataset.sel = sibs.indexOf(el);
  }

  // ---------- Сценарии ----------
  const TABS = { 'Главная': 'home', 'Платежи': 'pay', 'Сервисы': 'services', 'Карты': 'cards', 'Профиль': 'profile' };
  const TAB_SCREENS = ['home', 'services', 'pay', 'subs', 'cards', 'profile'];

  const toHome = () => reset('home');
  const R = {
    welcome: [['Стать клиентом', 'choose'], ['Войти', 'login']],
    choose: [
      ['Физическое лицо', 'p-data'],
      ['Юридическое лицо', 'b-bin'],
      ['Участник Astana Hub', 'h-status', { maxH: 170 }],
      ['Войти', 'login'],
    ],
    'p-data': [['Продолжить', 'p-sms'], [/^Согласен на обработку/, (el) => checkbox(el)]],
    'p-sms': [['Продолжить', 'p-selfie'], ['Изменить', 'back', { up: 0 }]],
    'p-selfie': [
      ['Сделать селфи', () => faceId(() => go('p-pin'), 'Проверяем селфи')],
      ['Подтвердить через eGov mobile', () => faceId(() => go('p-pin'), 'eGov mobile')],
    ],
    'p-done': [['На главную', toHome], ['Добавить в Apple Pay или Google Pay', () => toast('Карта добавлена в Wallet')]],
    'b-bin': [['Продолжить', 'b-ubo'], ['Найти', () => toast('Компания найдена в госреестре'), { up: 1 }]],
    'b-ubo': [['Отправить на проверку', 'b-review'], ['Отправить ссылку ещё раз', () => toast('Ссылка отправлена Данияру К.'), { up: 0 }]],
    'b-review': [['Перейти на главную', toHome], ['Пригласить бухгалтера', () => toast('Приглашение отправлено')]],
    'b-done': [['Перейти на главную', toHome], ['Пригласить бухгалтера', () => toast('Приглашение отправлено')]],
    'h-status': [['Продолжить', 'h-options'], [/^Ещё не участник/, () => toast('Откроем заявку на сайте Astana Hub')]],
    'h-options': [['Открыть счета', 'h-done']],
    'h-done': [['Перейти на главную', toHome]],
    login: [['Выйти', () => reset('welcome')], ['Забыли код?', () => toast('Восстановим доступ по SMS и селфи')]],
    home: [
      ['Перевод', 'tr-where'],
      ['Пополнить', () => toast('Реквизиты для пополнения скопированы')],
      ['Конвертация', () => toast('Конвертация по курсу 1 USD = 512,4 ₸')],
      ['Ещё', 'services'],
      ['Все счета и карты ›', 'cards', { up: 0 }],
      ['Все сервисы ›', 'services', { up: 0 }],
      ['Маркетплейс', 'mkt'],
      ['Отчётность', 'rep'],
      ['Подписки', 'subs'],
      ['Кредит', () => toast('Кредитная линия до 50 млн ₸ — предодобрено')],
      ['Госуслуги', () => toast('Справки и госуслуги для бизнеса')],
      ['AI-CFO', () => toast('AI-CFO: прогноз cash flow на квартал')],
      ['alem.gpt', () => toast('AI-ассистент alem.gpt')],
    ],
    services: [
      ['Переводы', 'tr-where', { maxH: 140 }], ['Маркетплейс', 'mkt', { maxH: 140 }], ['Отчётность', 'rep', { maxH: 140 }],
      ['Счета', 'cards', { maxH: 140 }], ['Платежи', 'pay', { maxH: 140 }],
      ['Кредит', () => toast('Кредитная линия до 50 млн ₸ — предодобрено'), { maxH: 140 }],
      ['Конвертация', () => toast('Конвертация по курсу 1 USD = 512,4 ₸'), { maxH: 140 }],
      ['Госуслуги', () => toast('Справки и госуслуги для бизнеса'), { maxH: 140 }],
      ['AI-CFO', () => toast('AI-CFO: прогноз cash flow на квартал'), { maxH: 140 }],
    ],
    profile: [['Реферальная программа', 'referral', { wide: true }]],
    'tr-where': [
      ['На карту', 'tr-card'], ['На PayPal', 'tr-paypal'], ['На Stripe', 'tr-stripe'],
      ['Данияр К.', 'tr-card'], ['Mila Design', 'tr-paypal'], ['Stripe', 'tr-stripe'],
      ['По номеру телефона', 'tr-card'], ['Между своими счетами', () => toast('Между своими счетами — без комиссии')],
    ],
    'tr-card': [[/^Далее/, 'tr-confirm']],
    'tr-paypal': [[/^Далее/, 'tr-confirm']],
    'tr-stripe': [[/^Далее/, 'tr-confirm']],
    'tr-confirm': [['Подтвердить', () => faceId(() => go('tr-done'))], ['Подтвердить PIN-кодом', 'tr-done']],
    'tr-done': [
      ['На главную', toHome],
      ['Скачать чек', () => toast('Чек сохранён в Файлы')],
      ['Поделиться квитанцией', () => toast('Квитанция готова к отправке')],
    ],
    pay: [['Оплатить по счёту', 'pay-req'], ['Поставщикам', 'pay-req'], ['Оплатить', 'pay-req', { up: 1 }]],
    'pay-req': [['Проверить', 'pay-confirm'], ['Открыть', () => toast('invoice_0912.pdf')]],
    'pay-confirm': [
      [/^Оплатить \d/, () => faceId(() => go('pay-done'))], ['Подтвердить PIN-кодом', 'pay-done'],
      ['Сейчас', select, { up: 1 }], ['Запланировать', select, { up: 1 }],
    ],
    'pay-done': [['К платежам', () => reset('pay')], ['Скачать чек', () => toast('Чек сохранён в Файлы')]],
    mkt: [
      ['SmartCRM', 'mkt-product', { maxH: 260 }],
      ['CRM', select, { up: 1 }], ['Бухгалтерия', select, { up: 1 }], ['HR', select, { up: 1 }], ['Безопасность', select, { up: 1 }],
      ['AI.Accountant', () => toast('AI.Accountant — месяц бесплатно'), { wide: true }],
      ['TalentLab', () => toast('TalentLab — скидка участника 15%'), { wide: true }],
      ['CyberPro', () => toast('CyberPro — скидка участника 10%'), { wide: true }],
    ],
    'mkt-product': [
      ['Попробовать бесплатно', 'mkt-contract'],
      ['Team · до 10 мест', select, { up: 2 }], ['Scale · без ограничений', select, { up: 2 }],
    ],
    'mkt-contract': [[/^Подписать и оплатить/, () => faceId(() => go('mkt-done'))], ['Открыть', () => toast('Договор-оферта SmartCRM'), { up: 0 }]],
    'mkt-done': [['Управление подпиской', 'subs'], ['Открыть SmartCRM', () => toast('Откроем SmartCRM')]],
    subs: [['SmartCRM', 'mkt-product']],
    rep: [['Проверить черновик за 4 квартал', 'rep-q'], ['3 квартал 2026', 'rep-q']],
    'rep-q': [['Источники и расчёт', 'rep-income'], ['Файлы и отправка', 'rep-files']],
    'rep-income': [['Дальше: файлы отчёта', 'rep-files']],
    'rep-files': [
      ['Отправить бухгалтеру', () => toast('Отчёт отправлен на buh@abc.example')],
      ['Скачать всё архивом', () => toast('Архив сохранён в Файлы')],
    ],
    referral: [['Пригласить компанию', () => toast('Ссылка-приглашение скопирована')]],
  };
  TAB_SCREENS.forEach((s) => {
    R[s] = (R[s] || []).concat(Object.entries(TABS).map(([t, id]) => [t, () => (stack[stack.length - 1] === id ? null : reset(id)), { tab: true }]));
  });

  function bind(el, fn) {
    el.classList.add('tap');
    el.addEventListener('click', (e) => { e.stopPropagation(); fn(); });
  }

  function prepare(id) {
    if (prepared.has(id)) return;
    prepared.add(id);
    const screen = screenEl(id);
    const root = screen.firstElementChild;

    // макетный статус-бар (строка с «9:41»)
    let sb = findTexts(root, '9:41')[0];
    while (sb && sb.parentElement !== root && box(sb.parentElement).h <= 64) sb = sb.parentElement;
    if (sb) sb.classList.add('fake-status');

    const rules = R[id] || [];
    const texts = rules.map((r) => r[0]);
    rules.forEach(([text, action, opts = {}]) => {
      let els = findTexts(screen, text);
      if (opts.tab) els = els.filter((e) => box(e).top > 700);
      else if (TAB_SCREENS.includes(id)) els = els.filter((e) => box(e).top < 740 || !TABS[text]);
      els.forEach((e) => {
        const el = clickable(e, screen, { ...opts, _text: text }, texts);
        bind(el, typeof action === 'function' ? () => action(el) : action === 'back' ? back : () => go(action));
      });
    });

    // кнопка «назад» — стрелка/шеврон в левом верхнем углу
    if (id !== 'login' && id !== 'welcome') {
      root.querySelectorAll('svg').forEach((svg) => {
        const b = box(svg);
        const inField = /background-color/.test(svg.parentElement.getAttribute('style') || '');
        if (b.top > 50 && b.top < 140 && b.left < 50 && b.w <= 32 && !inField && !svg.closest('.tap')) {
          const hit = svg.parentElement.childElementCount <= 2 && box(svg.parentElement).w < 60 ? svg.parentElement : svg;
          hit.style.padding = hit === svg ? '10px' : hit.style.padding;
          if (hit === svg) hit.style.margin = '-10px';
          bind(hit, back);
        }
      });
    }

    // переключатели 44×26
    root.querySelectorAll('div').forEach((el) => {
      const s = el.getAttribute('style') || '';
      if (/width: 44px/.test(s) && /height: 26px/.test(s) && /border-radius: 999px/.test(s)) {
        el.style.transition = 'background-color .2s';
        if (el.firstElementChild) el.firstElementChild.style.transition = 'transform .2s';
        let on = /#00AB76/i.test(s);
        const paint = () => {
          el.style.backgroundColor = on ? '#00AB76' : '#E7E8ED';
          el.style.justifyContent = 'flex-start';
          if (el.firstElementChild) el.firstElementChild.style.transform = on ? 'translateX(18px)' : 'none';
        };
        paint();
        const row = el.parentElement && box(el.parentElement).h < 100 ? el.parentElement : el;
        bind(row, () => { on = !on; paint(); });
      }
    });

    if (KEYPADS[id]) setupKeypad(screen, KEYPADS[id]);
  }

  // ---------- PIN-клавиатура ----------
  const KEYPADS = {
    login: { done: () => reset('home'), faceid: () => faceId(() => reset('home')) },
    'p-pin': { done: () => go('p-done') },
  };
  function setupKeypad(screen, cfg) {
    const dotsWrap = [...screen.querySelectorAll('div')].find((d) => {
      const k = [...d.children];
      return k.length === 4 && k.every((c) => /width: 14px/.test(c.getAttribute('style') || ''));
    });
    if (!dotsWrap) return;
    const dots = [...dotsWrap.children];
    const full = dots[0].getAttribute('style');
    const empty = dots[3].getAttribute('style');
    let n = 0;
    const paint = () => dots.forEach((d, i) => d.setAttribute('style', i < n ? full : empty));
    cfg.reset = () => { n = 0; paint(); };
    cfg.reset();
    findTexts(screen, /^\d$/).forEach((t) => {
      const key = t.parentElement;
      if (!/height: 64px/.test(key.getAttribute('style') || '')) return;
      key.classList.add('key');
      bind(key, () => {
        if (n >= 4) return;
        n++; paint();
        if (n === 4) setTimeout(() => { cfg.done(); setTimeout(cfg.reset, 600); }, 250);
      });
    });
    // нижний ряд: слева Face ID (если есть), справа «стереть»
    const lastRow = findTexts(screen, '0')[0]?.parentElement?.parentElement;
    if (lastRow) {
      const [left, , right] = lastRow.children;
      if (right && right.querySelector('svg')) bind(right, () => { if (n > 0) { n--; paint(); } });
      if (left && left.querySelector('svg') && cfg.faceid) bind(left, cfg.faceid);
    }
    if (cfg.faceid) enterHooks[screen.id.slice(2)] = () => cfg.reset && cfg.reset();
  }

  // ---------- Живые детали экранов ----------
  // SMS-код: доввод цифр и таймер
  enterHooks['p-sms'] = (screen) => {
    const boxes = [...screen.querySelectorAll('div')].find((d) => {
      const k = [...d.children];
      return k.length === 4 && k.every((c) => /width: 56px/.test(c.getAttribute('style') || ''));
    });
    const timer = findTexts(screen, /^Отправить повторно/)[0];
    if (boxes) {
      const cells = [...boxes.children];
      const digitStyle = cells[0].firstElementChild?.getAttribute('style');
      const plain = cells[3].dataset.s || cells[3].getAttribute('style');
      const focus = cells[2].dataset.s || cells[2].getAttribute('style');
      cells[2].dataset.s = focus; cells[3].dataset.s = plain;
      [2, 3].forEach((i) => { cells[i].innerHTML = ''; });
      cells[2].setAttribute('style', focus); cells[3].setAttribute('style', plain);
      const put = (i, d) => {
        const c = cells[i];
        c.setAttribute('style', plain + '; display: flex; align-items: center; justify-content: center');
        c.innerHTML = `<div style="${digitStyle}">${d}</div>`;
        if (cells[i + 1]) cells[i + 1].setAttribute('style', focus);
      };
      setTimeout(() => put(2, '1'), 900);
      setTimeout(() => put(3, '9'), 1300);
    }
    if (timer) {
      let s = 42;
      clearInterval(timer._t);
      timer.textContent = 'Отправить повторно через 0:42';
      timer._t = setInterval(() => {
        s = Math.max(0, s - 1);
        timer.textContent = s ? `Отправить повторно через 0:${String(s).padStart(2, '0')}` : 'Отправить код повторно';
        if (!s) clearInterval(timer._t);
      }, 1000);
    }
  };

  // Юрлицо на проверке: через пару секунд «приходит» push об открытии счетов
  enterHooks['b-review'] = () => {
    clearTimeout(enterHooks._rev);
    enterHooks._rev = setTimeout(() => {
      if (stack[stack.length - 1] === 'b-review')
        notify('Unicorn Bank', 'Проверка KYB пройдена — счета ABC LLP открыты', () => go('b-done'));
    }, 3500);
  };

  // ---------- Жесты ----------
  // свайп от левого края — назад, как в iOS
  let sx = null, sy = 0;
  device.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    sx = t.clientX < 24 ? t.clientX : null;
    sy = t.clientY;
  }, { passive: true });
  device.addEventListener('touchend', (e) => {
    if (sx == null) return;
    const t = e.changedTouches[0];
    if (t.clientX - sx > 70 && Math.abs(t.clientY - sy) < 60) back();
    sx = null;
  }, { passive: true });

  // три быстрых тапа по верхней кромке — меню сценариев для ведущего
  let taps = [];
  device.addEventListener('click', (e) => {
    const s = stage.getBoundingClientRect();
    const y = (e.clientY - s.top) / (s.width / W);
    if (y > 50) return;
    const now = Date.now();
    taps = taps.filter((t) => now - t < 700).concat(now);
    if (taps.length >= 3) { taps = []; openMenu(); }
  }, true);

  const MENU = [
    ['Старт', 'Сплэш и Welcome', 'splash'],
    ['Кейс 1 · Физлицо', 'Открытие счёта', 'choose', 'p-data'],
    ['Кейс 1 · Юрлицо', 'БИН, бенефициары, проверка', 'choose', 'b-bin'],
    ['Кейс 1 · Astana Hub', 'Статус участника и Founder-карта', 'choose', 'h-status'],
    ['Кейс 2 · Вход и главная', 'PIN, главная, сервисы', 'login'],
    ['Кейс 3 · Перевод', 'Карта, PayPal, Stripe', 'home', 'tr-where'],
    ['Кейс 4 · Платежи', 'Оплата по реквизитам из PDF', 'pay'],
    ['Кейс 5 · Маркетплейс', 'SmartCRM в один клик', 'home', 'mkt'],
    ['Кейс 6 · Отчёты Хаба', 'Отчёт за квартал', 'home', 'rep'],
    ['Карты и профиль', 'Founder-карта, рефералы', 'cards'],
  ];
  function openMenu() {
    if (document.getElementById('menu')) return;
    const m = document.createElement('div');
    m.id = 'menu';
    m.innerHTML = `<div class="menu-sheet"><div class="menu-title">Сценарии</div>${MENU.map((r, i) =>
      `<button type="button" data-i="${i}"><b>${r[0]}</b><span>${r[1]}</span></button>`).join('')}<button type="button" class="menu-close">Закрыть</button></div>`;
    device.appendChild(m);
    m.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (e.target === m || (b && b.classList.contains('menu-close'))) return m.remove();
      if (!b) return;
      const [, , base, sub] = MENU[+b.dataset.i];
      m.remove();
      busy = false;
      reset(base);
      if (base === 'splash') startSplash();
      if (sub) setTimeout(() => go(sub), 380);
    });
  }

  // ---------- Старт ----------
  function startSplash() {
    setTimeout(() => { if (stack[stack.length - 1] === 'splash') reset('welcome'); }, 1600);
  }
  reset('splash', 'none');
  startSplash();

  // подсказка установки — только в обычном Safari на iPhone
  const hint = document.getElementById('install-hint');
  if (!isStandalone() &&/iPhone|iPad|iPod/.test(navigator.userAgent)) {
    hint.hidden = false;
    document.getElementById('install-hint-close').onclick = () => { hint.hidden = true; };
  }

  if ('serviceWorker' in navigator && location.hostname !== 'localhost') {
    navigator.serviceWorker.register('sw.js');
  }

  window.__proto = { go, reset, back, stack };
})();
