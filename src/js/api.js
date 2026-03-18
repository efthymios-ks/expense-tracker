const SCHEMA = {
  users: {
    sheet: "Users",
    columns: ["Id", "DisplayName", "BackgroundColor", "ForegroundColor", "Emails"],
  },
  expenses: {
    sheet: "Expenses",
    columns: ["Id", "DateCreatedUtc", "AmountEuros", "CreatedBy", "Note", "BalanceId", "SplitWith"],
  },
  payments: {
    sheet: "Payments",
    columns: ["Id", "DateCreatedUtc", "FromUserId", "ToUserId", "AmountEuros", "Note", "BalanceId"],
  },
  balances: {
    sheet: "Balances",
    columns: ["Id", "DateCreatedUtc"],
  },
  settlements: {
    sheet: "Settlements",
    columns: ["Id", "BalanceId", "FromUserId", "ToUserId", "AmountEuros"],
  },
};

function SheetDb(schemaDef) {
  return {
    append: (obj) => window.sheets.append(schemaDef.sheet, schemaDef.columns, obj),
    updateRow: (rowIndex, obj) =>
      window.sheets.updateRow(schemaDef.sheet, schemaDef.columns, rowIndex, obj),
    deleteRow: (rowIndex) => window.sheets.deleteRow(schemaDef.sheet, rowIndex),
    newId: () => window.sheets.newId(),
  };
}

window.api = {
  // --- Startup ---

  async loadAll() {
    const [rawUsers, rawExpenses, rawPayments, rawBalances, rawSettlements] = await window.sheets.batchGetAll([
      SCHEMA.users, SCHEMA.expenses, SCHEMA.payments, SCHEMA.balances, SCHEMA.settlements,
    ]);

    const users = rawUsers.map(normalizeUser);
    const userMap = buildMap(users);

    window.state.allUsers = users;
    window.state.allExpenses = rawExpenses
      .map((row) => normalizeExpense(row, userMap))
      .sort((a, b) => (b.DateCreatedUtc || "").localeCompare(a.DateCreatedUtc || ""));
    window.state.allPayments = rawPayments
      .map((row) => normalizePayment(row, userMap))
      .sort((a, b) => (b.DateCreatedUtc || "").localeCompare(a.DateCreatedUtc || ""));
    window.state.allBalances = rawBalances
      .map((row) => normalizeBalance(row, window.state.allExpenses, window.state.allPayments, rawSettlements, userMap))
      .sort((a, b) => (b.DateCreatedUtc || "").localeCompare(a.DateCreatedUtc || ""));
    window.state.allSettlements = rawSettlements.map((row) => normalizeSettlement(row, userMap));
  },

  // --- Dashboard (sync — reads from state) ---

  computeCurrentOwed() {
    const unprocessed = window.state.allExpenses.filter((e) => !e.BalanceId);
    const openPayments = window.state.allPayments.filter((p) => !p.BalanceId);
    const userIds = window.state.allUsers.map((u) => u.Id);
    return calcSettlement(unprocessed, userIds, openPayments, window.state.allSettlements);
  },

  // Settlement preview for close period — current period only, no carry-forward
  computePeriodSettlement() {
    const unprocessed = window.state.allExpenses.filter((e) => !e.BalanceId);
    const openPayments = window.state.allPayments.filter((p) => !p.BalanceId);
    const userIds = window.state.allUsers.map((u) => u.Id);
    return calcSettlement(unprocessed, userIds, openPayments);
  },

  // --- Expenses ---

  async addExpense(expense) {
    const db = SheetDb(SCHEMA.expenses);
    await db.append({
      Id: db.newId(),
      DateCreatedUtc: expense.DateCreatedUtc || nowUtcString(),
      AmountEuros: expense.AmountEuros,
      CreatedBy: expense.CreatedBy,
      Note: expense.Note || "",
      BalanceId: "",
      SplitWith: expense.SplitWith || "",
    });
  },

  async updateExpense(expenseId, expense) {
    const rowIndex = await window.sheets.getRowIndexById(SCHEMA.expenses.sheet, expenseId);
    const update = {
      AmountEuros: expense.AmountEuros,
      CreatedBy: expense.CreatedBy,
      Note: expense.Note || "",
      SplitWith: expense.SplitWith || "",
    };
    if (expense.DateCreatedUtc) update.DateCreatedUtc = expense.DateCreatedUtc;
    await SheetDb(SCHEMA.expenses).updateRow(rowIndex, update);
  },

  async deleteExpense(expenseId) {
    const rowIndex = await window.sheets.getRowIndexById(SCHEMA.expenses.sheet, expenseId);
    await SheetDb(SCHEMA.expenses).deleteRow(rowIndex);
  },

  // --- Payments ---

  async addPayment(payment) {
    const db = SheetDb(SCHEMA.payments);
    await db.append({
      Id: db.newId(),
      DateCreatedUtc: payment.DateCreatedUtc || nowUtcString(),
      FromUserId: payment.FromUserId,
      ToUserId: payment.ToUserId,
      AmountEuros: payment.AmountEuros,
      Note: payment.Note || "",
      BalanceId: "",
    });
  },

  async updatePayment(paymentId, payment) {
    const rowIndex = await window.sheets.getRowIndexById(SCHEMA.payments.sheet, paymentId);
    const update = {
      FromUserId: payment.FromUserId,
      ToUserId: payment.ToUserId,
      AmountEuros: payment.AmountEuros,
      Note: payment.Note || "",
    };
    if (payment.DateCreatedUtc) update.DateCreatedUtc = payment.DateCreatedUtc;
    await SheetDb(SCHEMA.payments).updateRow(rowIndex, update);
  },

  async deletePayment(paymentId) {
    const rowIndex = await window.sheets.getRowIndexById(SCHEMA.payments.sheet, paymentId);
    await SheetDb(SCHEMA.payments).deleteRow(rowIndex);
  },

  // --- Balances ---

  async commitBalance() {
    const unprocessed = window.state.allExpenses.filter((e) => !e.BalanceId);
    const openPayments = window.state.allPayments.filter((p) => !p.BalanceId);
    if (!unprocessed.length && !openPayments.length) {
      throw new Error("No open expenses or payments to close.");
    }

    const balanceDb = SheetDb(SCHEMA.balances);
    const settlementDb = SheetDb(SCHEMA.settlements);
    const balanceId = balanceDb.newId();
    const dateCreatedUtc = nowUtcString();

    // Create the balance row
    await balanceDb.append({ Id: balanceId, DateCreatedUtc: dateCreatedUtc });

    // Calculate settlements
    const userIds = window.state.allUsers.map((u) => u.Id);
    const settlements = calcSettlement(unprocessed, userIds, openPayments);

    // Write settlement rows
    for (const s of settlements) {
      await settlementDb.append({
        Id: settlementDb.newId(),
        BalanceId: balanceId,
        FromUserId: s.fromUserId,
        ToUserId: s.toUserId,
        AmountEuros: s.amountEuros,
      });
    }

    // Stamp all open expenses with this balanceId
    for (const expense of unprocessed) {
      const rowIndex = await window.sheets.getRowIndexById(SCHEMA.expenses.sheet, expense.Id);
      await SheetDb(SCHEMA.expenses).updateRow(rowIndex, { BalanceId: balanceId });
    }

    // Stamp all open payments with this balanceId
    for (const payment of openPayments) {
      const rowIndex = await window.sheets.getRowIndexById(SCHEMA.payments.sheet, payment.Id);
      await SheetDb(SCHEMA.payments).updateRow(rowIndex, { BalanceId: balanceId });
    }
  },
};

// Normalize helpers

function normalizeUser(row) {
  return {
    ...row,
    Emails: row.Emails ? String(row.Emails).split(",").map((e) => e.trim()).filter(Boolean) : [],
    BackgroundColor: row.BackgroundColor || "#6c757d",
    ForegroundColor: row.ForegroundColor || "#ffffff",
  };
}

function normalizeExpense(row, userMap) {
  const splitWith = row.SplitWith ? String(row.SplitWith).split(",").filter(Boolean) : [];
  return {
    ...row,
    AmountEuros: parseFloat(row.AmountEuros) || 0,
    Note: row.Note || "",
    BalanceId: row.BalanceId || "",
    SplitWith: splitWith,
    splitUsers: splitWith.map((uid) => userMap[uid] || null).filter(Boolean),
    createdByUser: userMap[row.CreatedBy] || null,
  };
}

function normalizePayment(row, userMap) {
  return {
    ...row,
    AmountEuros: parseFloat(row.AmountEuros) || 0,
    Note: row.Note || "",
    BalanceId: row.BalanceId || "",
    fromUser: userMap[row.FromUserId] || null,
    toUser: userMap[row.ToUserId] || null,
  };
}

function normalizeBalance(row, allExpenses, allPayments, rawSettlements, userMap) {
  const expenses = allExpenses.filter((e) => e.BalanceId === row.Id);
  const payments = allPayments.filter((p) => p.BalanceId === row.Id);
  const settlements = rawSettlements
    .filter((s) => s.BalanceId === row.Id)
    .map((s) => normalizeSettlement(s, userMap));
  return {
    ...row,
    expenses,
    payments,
    settlements,
  };
}

function normalizeSettlement(row, userMap) {
  return {
    ...row,
    AmountEuros: parseFloat(row.AmountEuros) || 0,
    fromUser: userMap[row.FromUserId] || null,
    toUser: userMap[row.ToUserId] || null,
  };
}

// Settlement calculation

function calcSettlement(expenses, userIds, payments = [], pastSettlements = []) {
  const balances = {};
  userIds.forEach((id) => {
    balances[id] = 0;
  });

  // Carry forward debts from past closed periods
  pastSettlements.forEach((s) => {
    if (s.FromUserId in balances) balances[s.FromUserId] -= s.AmountEuros;
    if (s.ToUserId in balances) balances[s.ToUserId] += s.AmountEuros;
  });

  expenses.forEach((expense) => {
    const amount = parseFloat(expense.AmountEuros) || 0;
    // Empty SplitWith means split among all users (original Code.gs behaviour)
    const splitIds = (expense.SplitWith && expense.SplitWith.length > 0)
      ? expense.SplitWith
      : userIds;
    const share = amount / splitIds.length;

    splitIds.forEach((uid) => {
      if (uid in balances) balances[uid] -= share;
    });

    if (expense.CreatedBy in balances) {
      balances[expense.CreatedBy] += amount;
    }
  });

  // Payments reduce what is owed: payer gains credit, receiver loses credit
  payments.forEach((payment) => {
    const amount = parseFloat(payment.AmountEuros) || 0;
    if (payment.FromUserId in balances) balances[payment.FromUserId] += amount;
    if (payment.ToUserId in balances) balances[payment.ToUserId] -= amount;
  });

  const settlements = [];
  const creditors = Object.entries(balances)
    .filter(([, v]) => v > 0.005)
    .sort(([, a], [, b]) => b - a);
  const debtors = Object.entries(balances)
    .filter(([, v]) => v < -0.005)
    .sort(([, a], [, b]) => a - b);

  const credAmounts = creditors.map(([, v]) => v);
  const debtAmounts = debtors.map(([, v]) => -v);

  let ci = 0;
  let di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const amount = Math.min(credAmounts[ci], debtAmounts[di]);
    settlements.push({
      fromUserId: debtors[di][0],
      toUserId: creditors[ci][0],
      amountEuros: round2(amount),
    });
    credAmounts[ci] -= amount;
    debtAmounts[di] -= amount;
    if (credAmounts[ci] < 0.005) ci++;
    if (debtAmounts[di] < 0.005) di++;
  }

  return settlements;
}

// Utilities

function buildMap(items) {
  const map = {};
  items.forEach((item) => {
    map[item.Id] = item;
  });
  return map;
}

function round2(number) {
  return Math.round(number * 100) / 100;
}

function nowUtcString() {
  return new Date().toISOString();
}
