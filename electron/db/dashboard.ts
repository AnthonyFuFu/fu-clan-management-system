import { DASHBOARD_UPCOMING_DAYS, daysUntil, toDateString, upcomingEvents } from '../../shared/events';
import type { CountItem, DashboardStats, DocumentFile, FinanceTransaction, UpcomingBirthday } from '../../shared/types';
import { queryAll, queryOne, queryScalar } from './connection';
import { listEvents } from './events';
import { getBalanceUntil, getFinanceSummary } from './finance';

// 近期壽辰最多列出幾位、最近收支列出幾筆、近期活動列出幾筆
const MAX_BIRTHDAYS = 8;
const MAX_TRANSACTIONS = 5;
const MAX_EVENTS = 6;

// [下限, 上限, 顯示文字]；上限不含
const AGE_GROUPS: [number, number, string][] = [
  [0, 20, '未滿 20 歲'],
  [20, 40, '20–39 歲'],
  [40, 60, '40–59 歲'],
  [60, 80, '60–79 歲'],
  [80, Infinity, '80 歲以上'],
];

interface LivingMember {
  id: number;
  name: string;
  generation: number;
  birthday: string | null;
}

function parseBirthday(birthday: string): [number, number, number] | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(birthday);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

// 足歲：今年生日還沒到就少一歲
function ageOn(birthday: [number, number, number], today: Date): number {
  const [y, m, d] = birthday;
  const hadBirthday = today.getMonth() + 1 > m || (today.getMonth() + 1 === m && today.getDate() >= d);
  return today.getFullYear() - y - (hadBirthday ? 0 : 1);
}

// 下一次生日（今天生日算今天）；2/29 出生的人在平年由 Date 自動進位成 3/1
function nextBirthday(birthday: [number, number, number], today: Date): Date {
  const [, m, d] = birthday;
  const thisYear = new Date(today.getFullYear(), m - 1, d);
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return thisYear >= startOfToday ? thisYear : new Date(today.getFullYear() + 1, m - 1, d);
}

function memberStats(now: Date) {
  const living = queryAll<LivingMember>(
    'SELECT id, name, generation, birthday FROM members WHERE deceased = 0 ORDER BY generation, id'
  );

  const ageCounts = AGE_GROUPS.map(() => 0);
  const birthdays: UpcomingBirthday[] = [];
  let missingBirthdayCount = 0;

  living.forEach((member) => {
    const birthday = member.birthday ? parseBirthday(member.birthday) : null;
    if (!birthday) {
      missingBirthdayCount += 1;
      return;
    }
    const age = ageOn(birthday, now);
    const groupIndex = AGE_GROUPS.findIndex(([min, max]) => age >= min && age < max);
    if (groupIndex >= 0) ageCounts[groupIndex] += 1;

    const date = toDateString(nextBirthday(birthday, now));
    const days = daysUntil(date, now);
    if (days <= DASHBOARD_UPCOMING_DAYS) {
      birthdays.push({
        id: member.id,
        name: member.name,
        generation: member.generation,
        date,
        age: Number(date.slice(0, 4)) - birthday[0],
        daysUntil: days,
      });
    }
  });

  const genders = queryOne<{ male: number; female: number }>(
    `SELECT COALESCE(SUM(CASE WHEN gender = 'M' THEN 1 ELSE 0 END), 0) AS male,
            COALESCE(SUM(CASE WHEN gender = 'F' THEN 1 ELSE 0 END), 0) AS female
       FROM members WHERE deceased = 0`
  );

  return {
    livingCount: living.length,
    maleCount: genders?.male ?? 0,
    femaleCount: genders?.female ?? 0,
    generationCounts: queryAll<{ generation: number; count: number }>(
      'SELECT generation, COUNT(*) AS count FROM members WHERE deceased = 0 GROUP BY generation ORDER BY generation'
    ).map((row): CountItem => ({ label: `第 ${row.generation} 世`, count: row.count })),
    // 沒有分支的人歸在「未分支」，排在最後
    branchCounts: queryAll<CountItem>(
      `SELECT COALESCE(b.name, '未分支') AS label, COUNT(*) AS count
         FROM members m LEFT JOIN branches b ON b.id = m.branch_id
        WHERE m.deceased = 0
        GROUP BY m.branch_id
        ORDER BY m.branch_id IS NULL, count DESC, m.branch_id`
    ),
    ageGroups: AGE_GROUPS.map(([, , label], i) => ({ label, count: ageCounts[i] })),
    missingBirthdayCount,
    missingContactCount: Number(
      queryScalar(
        `SELECT COUNT(*) FROM members
          WHERE deceased = 0 AND COALESCE(TRIM(phone_no), '') = '' AND COALESCE(TRIM(cellphone), '') = ''`
      )
    ),
    upcomingBirthdays: birthdays
      .sort((a, b) => a.daysUntil - b.daysUntil || a.generation - b.generation || a.id - b.id)
      .slice(0, MAX_BIRTHDAYS),
  };
}

function eventStats(now: Date) {
  const year = now.getFullYear();
  const monthPrefix = toDateString(now).slice(0, 7);
  const last = new Date(now.getFullYear(), now.getMonth(), now.getDate() + DASHBOARD_UPCOMING_DAYS);
  return {
    monthlyEventCount: Number(
      queryScalar('SELECT COUNT(*) FROM events WHERE event_date LIKE ?', [`${monthPrefix}%`])
    ),
    yearEventCount: Number(queryScalar('SELECT COUNT(*) FROM events WHERE event_date LIKE ?', [`${year}-%`])),
    upcomingEvents: upcomingEvents(listEvents(toDateString(now), toDateString(last)), now, DASHBOARD_UPCOMING_DAYS).slice(
      0,
      MAX_EVENTS
    ),
  };
}

function documentStats() {
  const totals = queryOne<{ count: number; size: number }>(
    'SELECT COUNT(*) AS count, COALESCE(SUM(size), 0) AS size FROM documents'
  );
  return {
    documentCount: totals?.count ?? 0,
    documentTotalSize: totals?.size ?? 0,
    latestDocument: queryOne<DocumentFile>(
      `SELECT id, file_name AS fileName, size, uploaded_at AS uploadedAt
         FROM documents ORDER BY uploaded_at DESC, id DESC LIMIT 1`
    ),
  };
}

export function getDashboardStats(): DashboardStats {
  const now = new Date();
  const members = memberStats(now);
  const memberCount = Number(queryScalar('SELECT COUNT(*) FROM members'));

  return {
    memberCount,
    deceasedCount: memberCount - members.livingCount,
    branchCount: Number(queryScalar('SELECT COUNT(*) FROM branches')),
    ...members,
    ...eventStats(now),
    financeTotal: getBalanceUntil(null),
    finance: getFinanceSummary(now.getFullYear()),
    recentTransactions: queryAll<FinanceTransaction>(
      `SELECT id, type, category, item, amount, tx_date AS txDate, note
         FROM finance_transactions ORDER BY tx_date DESC, id DESC LIMIT ?`,
      [MAX_TRANSACTIONS]
    ),
    ...documentStats(),
  };
}
