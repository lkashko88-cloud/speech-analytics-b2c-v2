// ── Simulated data for 6 months (Oct 2025 – Mar 2026) ──────────────────

const OPERATORS = [
  { id: 'op1', name: 'Иванова Мария', shortName: 'Иванова М.', level: 'senior', hireDate: '2024-03-01' },
  { id: 'op2', name: 'Петрова Анна', shortName: 'Петрова А.', level: 'mid', hireDate: '2025-01-15' },
  { id: 'op3', name: 'Козлов Алексей', shortName: 'Козлов А.', level: 'junior', hireDate: '2025-09-01' },
];

const CRITERIA = [
  { key: 'contact', name: 'Установление контакта', short: 'Контакт', group: 'process' },
  { key: 'needs', name: 'Выявление потребностей', short: 'Потребности', group: 'process' },
  { key: 'presentation', name: 'Презентация', short: 'Презентация', group: 'process' },
  { key: 'objections', name: 'Работа с возражениями', short: 'Возражения', group: 'process' },
  { key: 'closing', name: 'Завершение сделки', short: 'Завершение', group: 'process' },
  { key: 'modules', name: 'Модули завершения', short: 'Модули', group: 'process' },
  { key: 'grammar', name: 'Грамотность речи', short: 'Грамотность', group: 'comm' },
  { key: 'tone', name: 'Эмоциональный тон', short: 'Тон', group: 'comm' },
  { key: 'activity', name: 'Активная позиция', short: 'Активность', group: 'comm' },
  { key: 'listening', name: 'Активное слушание', short: 'Слушание', group: 'comm' },
];

const PRODUCTS = ['ИКТВ Movix', 'КТВ', 'Приставки', 'Оборудование ИНТ', 'Услуга ИНТ МКД', 'Услуга ИНТ ЧС'];

// Revenue: units (шт.) per product — operator motivation is in units, not rubles
const PRODUCT_UNITS = {
  'ИКТВ Movix': 1,
  'КТВ': 1,
  'Приставки': 1,
  'Оборудование ИНТ': 1,
  'Услуга ИНТ МКД': 1,
  'Услуга ИНТ ЧС': 1,
};

// ARPU for ruble conversion (placeholder — to be confirmed by business)
const PRODUCT_ARPU = {
  'ИКТВ Movix': 450,
  'КТВ': 380,
  'Приставки': 290,
  'Оборудование ИНТ': 520,
  'Услуга ИНТ МКД': 600,
  'Услуга ИНТ ЧС': 750,
};

const CLIENT_SEGMENTS = {
  type: ['Новый клиент', 'Текущий клиент'],
  gender: ['Мужчина', 'Женщина'],
  age: ['18-25', '26-35', '36-45', '46-55', '55+'],
  traffic: ['До 50 ГБ', '50-200 ГБ', '200-500 ГБ', '500+ ГБ'],
  housing: ['Квартира', 'Частный дом'],
  devices: ['1-2 устройства', '3-5 устройств', '6+ устройств'],
};

const SUCCESS_LABELS = ['Отлично', 'Хорошо', 'Частично', 'Неуспешно'];

const REC_ACTIONS = {
  'Контакт': 'Полное приветствие: имя, компания, уточнение имени клиента',
  'Потребности': 'Открытые вопросы: площадь, кол-во устройств, цели использования',
  'Презентация': 'Связывать тариф с потребностью: «Засмотрись» → «Кино и развлечения»',
  'Возражения': 'Банк аргументов по топ-5 возражениям + «согласие + аргумент»',
  'Завершение': 'Инициировать: «Давайте оформим заявку, подключение бесплатное»',
  'Модули': 'Завершать: «Остались вопросы?» + точная дата/время подключения',
  'Грамотность': 'Убрать слова-паразиты, профессиональная лексика',
  'Тон': 'Ровный доброжелательный тон, без разговорных оборотов',
  'Активность': 'Вести диалог, структурировать этапы, объяснять логику',
  'Слушание': 'Перефразировать: «Правильно ли я понимаю, что вам нужно...»',
};

const TOP_FOCUS_STEPS = {
  'Завершение': [
    'Прослушать 5 худших звонков — зафиксировать момент потери инициативы',
    'Внедрить скрипт: резюме потребностей → фиксация шага → подтверждение даты',
    'Ежедневно проверять последние 2 минуты каждого звонка',
  ],
  'Презентация': [
    'Перед звонком записывать цель в CRM (1 предложение)',
    'Первые 30 сек: озвучить цель клиенту «Для вашей задачи — [X], чтобы вы получили [Y]»',
    'После звонка сверить результат с целью',
  ],
  'Возражения': [
    'Собрать топ-5 возражений из последних звонков',
    'На каждое: согласие + аргумент + вопрос',
    'Провести ролевую игру: супервайзер = клиент',
  ],
  'Потребности': [
    'Составить 5 открытых вопросов для каждого продукта',
    'Первые 2 минуты звонка — только вопросы, без презентации',
    'Отмечать в CRM выявленные потребности после каждого звонка',
  ],
  'Контакт': [
    'Стандартизировать: имя + компания + имя клиента',
    'Первые 10 сек — улыбка в голосе, снижение темпа',
    'Прослушать 3 лучших приветствия в команде',
  ],
  'Модули': [
    'Чек-лист: итог + следующий шаг + контакт + благодарность',
    'Проверять: был ли вопрос «Остались ли вопросы?»',
    'Добавить в скрипт точную дату/время следующего контакта',
  ],
  'Слушание': [
    'Перефразировать после ответа: «Правильно ли я понимаю...»',
    'Выдерживать паузу 2 сек после ответа клиента',
    'Фиксировать ключевые слова клиента и использовать в презентации',
  ],
};

// ── Seeded random ──────────────────────────────────────────────────────
function seededRandom(seed) {
  let s = seed;
  return function() {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const rand = seededRandom(42);

function randInt(min, max) { return Math.floor(rand() * (max - min + 1)) + min; }
function randFloat(min, max) { return rand() * (max - min) + min; }
function randChoice(arr) { return arr[Math.floor(rand() * arr.length)]; }
function randNormal(mean, std) {
  const u1 = rand(), u2 = rand();
  return mean + std * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}
function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }

// ── Generate 6 months of call data ─────────────────────────────────────
function generateCallData() {
  const calls = [];
  const startDate = new Date(2025, 9, 1); // Oct 2025
  const endDate = new Date(2026, 2, 28);  // Mar 2026

  // Base scores per operator (senior > mid > junior)
  const baseScores = {
    op1: { contact: 4.5, needs: 4.2, presentation: 4.0, objections: 3.8, closing: 3.5, modules: 4.3, grammar: 4.6, tone: 4.4, activity: 4.1, listening: 4.0 },
    op2: { contact: 4.0, needs: 3.5, presentation: 3.2, objections: 3.0, closing: 2.8, modules: 3.8, grammar: 4.2, tone: 4.0, activity: 3.5, listening: 3.3 },
    op3: { contact: 3.2, needs: 2.8, presentation: 2.5, objections: 2.3, closing: 2.0, modules: 3.0, grammar: 3.5, tone: 3.3, activity: 2.8, listening: 2.5 },
  };

  // Monthly improvement rates
  const improvementRate = { op1: 0.02, op2: 0.05, op3: 0.08 };

  let sessionId = 123440000;

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    if (d.getDay() === 0) continue; // skip Sundays

    for (const op of OPERATORS) {
      const callsPerDay = randInt(3, 8);
      const monthIdx = (d.getFullYear() - 2025) * 12 + d.getMonth() - 9; // 0 = Oct

      for (let c = 0; c < callsPerDay; c++) {
        sessionId++;
        const isTargeted = rand() > 0.15; // 85% targeted

        // Client profile
        const client = {
          type: randChoice(CLIENT_SEGMENTS.type),
          gender: randChoice(CLIENT_SEGMENTS.gender),
          age: randChoice(CLIENT_SEGMENTS.age),
          traffic: randChoice(CLIENT_SEGMENTS.traffic),
          housing: randChoice(CLIENT_SEGMENTS.housing),
          devices: randChoice(CLIENT_SEGMENTS.devices),
        };

        const product = randChoice(PRODUCTS);
        const duration = isTargeted ? clamp(randNormal(8, 3), 2, 25) : clamp(randNormal(3, 1.5), 0.5, 8);

        // Criteria scores with monthly improvement
        const scores = {};
        let totalScore = 0;
        let scoreCount = 0;

        if (isTargeted) {
          for (const cr of CRITERIA) {
            const base = baseScores[op.id][cr.key];
            const improved = base + monthIdx * improvementRate[op.id];
            const noise = randNormal(0, 0.4);
            const score = clamp(Math.round((improved + noise) * 2) / 2, 1, 5); // round to 0.5
            scores[cr.key] = score;
            totalScore += score;
            scoreCount++;
          }
        }

        const qaScore = isTargeted ? Math.round(totalScore / scoreCount * 100) / 100 : 0;

        // Success label based on QA score
        let success;
        if (!isTargeted) success = 'Не оценено';
        else if (qaScore >= 4.2) success = 'Отлично';
        else if (qaScore >= 3.5) success = 'Хорошо';
        else if (qaScore >= 2.8) success = 'Частично';
        else success = 'Неуспешно';

        // Conversion (strongly linked to QA score — exponential curve)
        // Conversion: realistic 60-70% average, linked to QA score
        // qaScore 2.0 → ~45%, 3.0 → ~58%, 3.5 → ~65%, 4.0 → ~72%, 4.5 → ~78%, 5.0 → ~85%
        const convProb = isTargeted ? clamp(0.30 + qaScore * 0.11, 0.15, 0.88) : 0;
        const converted = isTargeted && rand() < convProb;

        const sentiment = randChoice(['нейтральный', 'нейтральный', 'нейтральный', 'позитивный', 'негативный']);

        // Funnel: Недозвон (didn't reach client) — only for targeted
        const isNedozvon = isTargeted && !converted && rand() < 0.12; // ~12% of targeted
        // Funnel: Заключка (application created after sale)
        const isZakluchka = converted && rand() < 0.85; // 85% of sales → application
        // Funnel: Подключка (connected within 35 days)
        const isPodkluchka = isZakluchka && rand() < 0.78; // 78% of applications → connected

        // Revenue in units (1 sale = 1 unit of product)
        const units = converted ? 1 : 0;
        const revenueRub = converted ? PRODUCT_ARPU[product] : 0;

        calls.push({
          date: d.toISOString().slice(0, 10),
          operatorId: op.id,
          operator: op.shortName,
          session: sessionId,
          isTargeted,
          duration: Math.round(duration * 10) / 10,
          product,
          client,
          scores,
          qaScore,
          success,
          converted,
          isNedozvon,
          isZakluchka,
          isPodkluchka,
          sentiment,
          units,
          revenue: revenueRub,
        });
      }
    }
  }

  return calls;
}

// ── Aggregate weekly data ──────────────────────────────────────────────
function aggregateWeekly(calls) {
  const weeks = {};

  for (const call of calls) {
    const d = new Date(call.date);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay() + 1); // Monday
    const weekKey = weekStart.toISOString().slice(0, 10);

    if (!weeks[weekKey]) {
      weeks[weekKey] = { date: weekKey, operators: {} };
    }

    const opId = call.operatorId;
    if (!weeks[weekKey].operators[opId]) {
      weeks[weekKey].operators[opId] = {
        calls: 0, targeted: 0, successful: 0, revenue: 0,
        qaScores: [], criteriaScores: {},
      };
      for (const cr of CRITERIA) {
        weeks[weekKey].operators[opId].criteriaScores[cr.key] = [];
      }
    }

    const w = weeks[weekKey].operators[opId];
    w.calls++;
    if (call.isTargeted) {
      w.targeted++;
      w.qaScores.push(call.qaScore);
      for (const cr of CRITERIA) {
        if (call.scores[cr.key] !== undefined) {
          w.criteriaScores[cr.key].push(call.scores[cr.key]);
        }
      }
    }
    if (call.converted) {
      w.successful++;
      w.revenue += call.revenue;
    }
  }

  // Convert to array with averages
  return Object.values(weeks).map(w => {
    const opData = {};
    for (const [opId, data] of Object.entries(w.operators)) {
      opData[opId] = {
        calls: data.calls,
        targeted: data.targeted,
        successful: data.successful,
        revenue: data.revenue,
        conversion: data.targeted > 0 ? data.successful / data.targeted : 0,
        avgQa: data.qaScores.length > 0 ? data.qaScores.reduce((a, b) => a + b, 0) / data.qaScores.length : 0,
        criteriaAvg: {},
      };
      for (const cr of CRITERIA) {
        const vals = data.criteriaScores[cr.key];
        opData[opId].criteriaAvg[cr.key] = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      }
    }
    return { date: w.date, operators: opData };
  }).sort((a, b) => a.date.localeCompare(b.date));
}

// ── Generate all data ──────────────────────────────────────────────────
const ALL_CALLS = generateCallData();
const WEEKLY_DATA = aggregateWeekly(ALL_CALLS);

// ── Filter helpers ─────────────────────────────────────────────────────
function filterByPeriod(calls, period) {
  if (period === 'all') return calls;
  const now = new Date('2026-03-28');
  const days = { '7d': 7, '30d': 30, '90d': 90 };
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - days[period]);
  return calls.filter(c => new Date(c.date) >= cutoff);
}

function filterWeeklyByPeriod(weekly, period) {
  if (period === 'all') return weekly;
  const now = new Date('2026-03-28');
  const days = { '7d': 7, '30d': 30, '90d': 90 };
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - days[period]);
  return weekly.filter(w => new Date(w.date) >= cutoff);
}
