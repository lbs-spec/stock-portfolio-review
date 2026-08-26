import * as XLSX from 'xlsx';
import type { ParsedPositionFile, PortfolioSummary, Position } from '@/types';

function parseNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/,/g, '').replace(/%/g, '').trim();
    const num = Number(cleaned);
    return Number.isNaN(num) ? 0 : num;
  }
  return 0;
}

function parseDate(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'number') {
    // Excel serial date
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      return new Date(date.y, date.m - 1, date.d, date.H, date.M, date.S).toISOString();
    }
  }
  const str = String(value).trim();
  if (!str) return null;
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function parsePositionTemplate(buffer: ArrayBuffer): ParsedPositionFile {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][];

  if (rows.length < 5) {
    throw new Error('持仓模板数据不足，请检查文件');
  }

  // Row 1 (index 0) contains account summary labels and values interleaved
  const summaryRow = rows[0];
  const summaryMap = new Map<string, string>();
  for (let i = 0; i < summaryRow.length; i += 2) {
    const key = String(summaryRow[i] ?? '').trim();
    const value = summaryRow[i + 1];
    if (key) {
      summaryMap.set(key, String(value ?? ''));
    }
  }

  const exportedAt = parseDate(summaryMap.get('导出时间'));

  const summary: PortfolioSummary = {
    import_batch_id: crypto.randomUUID(),
    exported_at: exportedAt,
    total_assets: parseNumber(summaryMap.get('总资产')),
    available_cash: parseNumber(summaryMap.get('可用资金')),
    withdrawable_cash: parseNumber(summaryMap.get('可取资金')),
    market_value: parseNumber(summaryMap.get('证券市值')),
    position_pnl: parseNumber(summaryMap.get('持仓盈亏')),
    daily_pnl: parseNumber(summaryMap.get('当日盈亏参考')),
  };

  // Header row at index 3
  const headerRow = rows[3].map((h) => String(h ?? '').trim());
  const headers: Record<string, number> = {};
  headerRow.forEach((h, idx) => {
    if (h) headers[h] = idx;
  });

  const positions: Position[] = [];
  for (let i = 4; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((cell) => !cell)) continue;

    const code = String(row[headers['证券代码']] ?? '').trim();
    if (!code) continue;

    const market = String(row[headers['交易市场']] ?? '').trim();
    const currencyRaw = String(row[headers['币种']] ?? '').trim();
    const currency = currencyRaw || (market === '沪港通' ? '人民币' : '人民币');

    const position: Position = {
      code,
      name: String(row[headers['证券名称']] ?? '').trim(),
      quantity: Math.round(parseNumber(row[headers['持仓数量']])),
      available_quantity: Math.round(parseNumber(row[headers['可用数量']])),
      cost_price: parseNumber(row[headers['成本价']]),
      latest_price: parseNumber(row[headers['最新价']]),
      position_pnl_ratio: parseNumber(row[headers['持仓盈亏比例']]),
      position_pnl: parseNumber(row[headers['持仓盈亏']]),
      daily_pnl_ratio: parseNumber(row[headers['当日盈亏比例']]),
      daily_pnl: parseNumber(row[headers['当日盈亏']]),
      avg_buy_price: parseNumber(row[headers['买入均价']]),
      position_ratio: parseNumber(row[headers['个股仓位']]),
      market_value: parseNumber(row[headers['最新市值']]),
      market,
      currency,
      account: String(row[headers['股东账号']] ?? '').trim(),
      import_batch_id: summary.import_batch_id,
    };

    positions.push(position);
  }

  return { summary, positions };
}
