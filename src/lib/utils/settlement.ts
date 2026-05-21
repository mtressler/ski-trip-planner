/**
 * Debt simplification: given a list of expense splits, compute the minimum
 * set of transactions to settle all debts.
 *
 * Returns: array of { from, to, amount } where `from` owes `to` $amount.
 */

export interface Split {
  paidById: string;
  userId: string;  // person who owes their share
  share: number;
  settled: boolean;
}

export interface Settlement {
  from: string;
  to: string;
  amount: number;
}

export function computeSettlement(splits: Split[]): Settlement[] {
  // Build net balance per person (positive = owed money, negative = owes money)
  const balance = new Map<string, number>();

  for (const split of splits) {
    if (split.settled) continue;

    // The payer is owed this share
    balance.set(split.paidById, (balance.get(split.paidById) ?? 0) + split.share);
    // The participant owes this share
    balance.set(split.userId, (balance.get(split.userId) ?? 0) - split.share);
  }

  // Remove zero balances
  const creditors: { id: string; amount: number }[] = [];
  const debtors: { id: string; amount: number }[] = [];

  for (const [id, amount] of balance.entries()) {
    const rounded = Math.round(amount * 100) / 100;
    if (rounded > 0.005) creditors.push({ id, amount: rounded });
    else if (rounded < -0.005) debtors.push({ id, amount: Math.abs(rounded) });
  }

  // Greedy settlement
  const transactions: Settlement[] = [];

  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];
    const amount = Math.min(creditor.amount, debtor.amount);
    const rounded = Math.round(amount * 100) / 100;

    if (rounded > 0.005) {
      transactions.push({ from: debtor.id, to: creditor.id, amount: rounded });
    }

    creditor.amount -= amount;
    debtor.amount -= amount;

    if (creditor.amount < 0.005) ci++;
    if (debtor.amount < 0.005) di++;
  }

  return transactions;
}
