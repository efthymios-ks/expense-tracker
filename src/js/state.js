export const state = {
  allUsers: [],
  allExpenses: [],
  allPayments: [],
  allBalances: [],
  allSettlements: [],
  currentTab: "dashboard",
  _filteredExpenses: [],
  _filteredPayments: [],
  currentUserEmail: "",
  get allNotes() {
    const notes = new Set();
    for (const e of this.allExpenses) {
      if (e.Note) notes.add(e.Note);
    }
    for (const p of this.allPayments) {
      if (p.Note) notes.add(p.Note);
    }
    return [...notes].sort();
  },
};

window.state = state;
