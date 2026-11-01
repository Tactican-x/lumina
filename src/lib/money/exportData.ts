import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';

import { getAllMoneyTransactions } from '@/db/repositories/moneyTransactions';
import { getAllMoneyCategories } from '@/db/repositories/moneyCategories';
import { monthKeyFromDate, formatMonthLabel, formatCents } from '@/lib/money/money';
import { getCurrentCurrency } from '@/stores/currencyStore';

function escapeCSV(value: unknown): string {
  if (value == null) return '';
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function fmtDate(d: unknown): string {
  const date = new Date(d as any);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

function fileStamp(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

export async function generateTransactionsCSV(): Promise<string> {
  const [txs, cats] = await Promise.all([getAllMoneyTransactions(), getAllMoneyCategories()]);
  const currency = getCurrentCurrency();
  const catById = new Map(cats.map((c) => [c.id, c]));

  const header = ['Date', 'Type', 'Category', 'Amount', 'Currency', 'Note', 'Month'].join(',');

  const rows = txs.map((t) => {
    const cat = catById.get(t.categoryId);
    const monthKey = t.monthKey ?? monthKeyFromDate(new Date(t.occurredAt as any));
    const amount = ((t.amountCents ?? 0) / 100).toFixed(2);

    return [
      escapeCSV(fmtDate(t.occurredAt)),
      escapeCSV(t.type),
      escapeCSV(cat?.name ?? 'Unknown'),
      escapeCSV(amount),
      escapeCSV(currency.code),
      escapeCSV(t.note ?? ''),
      escapeCSV(formatMonthLabel(monthKey)),
    ].join(',');
  });

  return [header, ...rows].join('\n');
}

export async function generateSummaryCSV(): Promise<string> {
  const [txs, cats] = await Promise.all([getAllMoneyTransactions(), getAllMoneyCategories()]);
  const currency = getCurrentCurrency();
  const catById = new Map(cats.map((c) => [c.id, c]));

  const monthly = new Map<string, { incomeCents: number; expenseCents: number; txCount: number }>();
  for (const t of txs) {
    const mk = t.monthKey ?? monthKeyFromDate(new Date(t.occurredAt as any));
    const cur = monthly.get(mk) ?? { incomeCents: 0, expenseCents: 0, txCount: 0 };
    if (t.type === 'income') cur.incomeCents += t.amountCents ?? 0;
    else cur.expenseCents += t.amountCents ?? 0;
    cur.txCount += 1;
    monthly.set(mk, cur);
  }

  const byCat = new Map<string, number>();
  for (const t of txs) {
    if (t.type !== 'expense') continue;
    const catName = catById.get(t.categoryId)?.name ?? 'Unknown';
    byCat.set(catName, (byCat.get(catName) ?? 0) + (t.amountCents ?? 0));
  }

  const sortedMonths = [...monthly.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  const sortedCats = [...byCat.entries()].sort((a, b) => b[1] - a[1]);

  const totalIncome = txs.filter((t) => t.type === 'income').reduce((s, t) => s + (t.amountCents ?? 0), 0);
  const totalExpense = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + (t.amountCents ?? 0), 0);

  let out = '';
  out += 'MONTHLY SUMMARY\n';
  out += 'Month,Income,Expenses,Net,Transactions\n';
  for (const [mk, v] of sortedMonths) {
    out += `${escapeCSV(formatMonthLabel(mk))},${(v.incomeCents / 100).toFixed(2)},${(v.expenseCents / 100).toFixed(
      2
    )},${((v.incomeCents - v.expenseCents) / 100).toFixed(2)},${v.txCount}\n`;
  }

  out += '\n';
  out += 'CATEGORY BREAKDOWN (Expenses)\n';
  out += 'Category,Amount\n';
  for (const [name, cents] of sortedCats) {
    out += `${escapeCSV(name)},${(cents / 100).toFixed(2)}\n`;
  }

  out += '\n';
  out += 'OVERALL SUMMARY\n';
  out += `Currency,${escapeCSV(currency.code)}\n`;
  out += `Total Transactions,${txs.length}\n`;
  out += `Total Income,${(totalIncome / 100).toFixed(2)}\n`;
  out += `Total Expenses,${(totalExpense / 100).toFixed(2)}\n`;
  out += `Net,${((totalIncome - totalExpense) / 100).toFixed(2)}\n`;
  out += `Export Date,${fmtDate(new Date())}\n`;

  return out;
}

export async function generateTransactionsJSON(): Promise<string> {
  const [txs, cats] = await Promise.all([getAllMoneyTransactions(), getAllMoneyCategories()]);
  const currency = getCurrentCurrency();
  const catById = new Map(cats.map((c) => [c.id, c]));

  const data = {
    exportDate: new Date().toISOString(),
    currency: currency.code,
    transactions: txs.map((t) => ({
      id: t.id,
      occurredAt: new Date(t.occurredAt as any).toISOString(),
      monthKey: t.monthKey ?? monthKeyFromDate(new Date(t.occurredAt as any)),
      type: t.type,
      categoryId: t.categoryId,
      categoryName: catById.get(t.categoryId)?.name ?? 'Unknown',
      amountCents: t.amountCents ?? 0,
      note: t.note ?? '',
    })),
    categories: cats,
  };

  return JSON.stringify(data, null, 2);
}

export async function exportTransactions(
  format: 'csv' | 'json' | 'summary' = 'csv'
): Promise<{ success: boolean; message: string; filePath?: string }> {
  try {
    const available = await Sharing.isAvailableAsync();
    if (!available) return { success: false, message: 'Sharing is not available on this device.' };

    const stamp = fileStamp();
    const filename =
      format === 'json'
        ? `money_export_${stamp}.json`
        : format === 'summary'
          ? `money_summary_${stamp}.csv`
          : `money_transactions_${stamp}.csv`;

    const mimeType = format === 'json' ? 'application/json' : 'text/csv';

    const content =
      format === 'json'
        ? await generateTransactionsJSON()
        : format === 'summary'
          ? await generateSummaryCSV()
          : await generateTransactionsCSV();

    if (!FileSystem.cacheDirectory) {
      return { success: false, message: 'File cache directory is not available.' };
    }

    const filePath = `${FileSystem.cacheDirectory}${filename}`;

    await FileSystem.writeAsStringAsync(filePath, content);
    await Sharing.shareAsync(filePath, { mimeType, dialogTitle: 'Export Money Data' });

    return { success: true, message: 'Export complete.', filePath };
  } catch (e: any) {
    console.error('Export error:', e);
    return { success: false, message: e?.message ?? 'Export failed.' };
  }
}

/**
 * ✅ NEW: Export as PDF using expo-print (simple + no heavy libs)
 */
export async function exportMoneyPdf(mode: 'summary' | 'transactions' = 'summary'): Promise<{
  success: boolean;
  message: string;
  filePath?: string;
}> {
  try {
    const available = await Sharing.isAvailableAsync();
    if (!available) return { success: false, message: 'Sharing is not available on this device.' };

    const [txs, cats] = await Promise.all([getAllMoneyTransactions(), getAllMoneyCategories()]);
    const catById = new Map(cats.map((c) => [c.id, c]));
    const currency = getCurrentCurrency();

    const totalIncome = txs.filter((t) => t.type === 'income').reduce((s, t) => s + (t.amountCents ?? 0), 0);
    const totalExpense = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + (t.amountCents ?? 0), 0);
    const net = totalIncome - totalExpense;

    const title = mode === 'summary' ? 'Money Tracker Summary' : 'Money Tracker Transactions';

    const txRows =
      mode === 'transactions'
        ? txs
            .slice(0, 250) // keep PDFs fast; raise if you want
            .map((t) => {
              const cat = catById.get(t.categoryId);
              const date = new Date(t.occurredAt as any);
              const mk = t.monthKey ?? monthKeyFromDate(date);
              const sign = t.type === 'expense' ? '-' : '+';

              return `
                <tr>
                  <td>${fmtDate(date)}</td>
                  <td>${t.type}</td>
                  <td>${(cat?.emoji ?? '')} ${(cat?.name ?? 'Unknown')}</td>
                  <td style="text-align:right; font-weight:700;">${sign}${formatCents(t.amountCents ?? 0)}</td>
                  <td>${(t.note ?? '').replace(/</g, '&lt;')}</td>
                  <td>${formatMonthLabel(mk)}</td>
                </tr>
              `;
            })
            .join('')
        : '';

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: -apple-system, system-ui, Segoe UI, Roboto, Arial; padding: 18px; color: #111; }
            h1 { margin: 0 0 6px 0; font-size: 22px; }
            .meta { color: #555; margin-bottom: 14px; font-size: 12px; }
            .kpis { display: flex; gap: 10px; margin: 14px 0 18px; }
            .kpi { flex: 1; border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px; }
            .kpiLabel { color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; }
            .kpiVal { font-weight: 800; margin-top: 6px; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            th, td { border-bottom: 1px solid #e5e7eb; padding: 8px 6px; font-size: 11px; vertical-align: top; }
            th { text-align: left; color: #6b7280; text-transform: uppercase; letter-spacing: .04em; font-size: 10px; }
            .note { margin-top: 10px; color: #6b7280; font-size: 11px; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <div class="meta">
            Exported: ${new Date().toISOString().replace('T', ' ').slice(0, 19)} • Currency: ${currency.code}
          </div>

          <div class="kpis">
            <div class="kpi">
              <div class="kpiLabel">Total Income</div>
              <div class="kpiVal">${formatCents(totalIncome)}</div>
            </div>
            <div class="kpi">
              <div class="kpiLabel">Total Expenses</div>
              <div class="kpiVal">${formatCents(totalExpense)}</div>
            </div>
            <div class="kpi">
              <div class="kpiLabel">Net</div>
              <div class="kpiVal">${formatCents(net)}</div>
            </div>
          </div>

          ${
            mode === 'transactions'
              ? `
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Category</th>
                      <th style="text-align:right;">Amount</th>
                      <th>Note</th>
                      <th>Month</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${txRows}
                  </tbody>
                </table>
                <div class="note">Showing up to 250 transactions for PDF performance.</div>
              `
              : `<div class="note">Use “Transactions PDF” to export a printable list of entries.</div>`
          }
        </body>
      </html>
    `;

    const result = await Print.printToFileAsync({ html });

    await Sharing.shareAsync(result.uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Export Money PDF',
      UTI: 'com.adobe.pdf',
    });

    return { success: true, message: 'PDF exported.', filePath: result.uri };
  } catch (e: any) {
    console.error('PDF export error:', e);
    return { success: false, message: e?.message ?? 'PDF export failed.' };
  }
}

export async function getExportStats(): Promise<{
  totalTransactions: number;
  totalCategories: number;
  dateRange: { start: string; end: string } | null;
}> {
  const [txs, cats] = await Promise.all([getAllMoneyTransactions(), getAllMoneyCategories()]);

  if (txs.length === 0) {
    return { totalTransactions: 0, totalCategories: cats.length, dateRange: null };
  }

  const times = txs.map((t) => new Date(t.occurredAt as any).getTime());
  const start = new Date(Math.min(...times));
  const end = new Date(Math.max(...times));

  return {
    totalTransactions: txs.length,
    totalCategories: cats.length,
    dateRange: { start: fmtDate(start), end: fmtDate(end) },
  };
}