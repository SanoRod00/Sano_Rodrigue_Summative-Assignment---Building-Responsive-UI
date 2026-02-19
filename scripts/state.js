(function () {
    var APP = window.BudgetBuddy || (window.BudgetBuddy = {});

    var CATEGORIES = [
        "Food & Drink",
        "Transport",
        "Books",
        "Data/Airtime",
        "Fees",
        "Academic",
        "Personal",
        "Health",
        "Utilities"
    ];

    var DEFAULT_SETTINGS = {
        budgetCap: 150000,
        baseCurrency: "RWF",
        usdToRwf: 1200,
        eurToRwf: 1300,
        caseSensitive: false
    };

    var DEFAULT_UI = {
        view: "dashboard",
        search: "",
        category: "all",
        dateRange: "last-30",
        sort: "date_desc",
        page: 1,
        pageSize: 8,
        modalOpen: false,
        editingId: "",
        regexError: "",
        receiptName: ""
    };

    function nowIso() {
        return new Date().toISOString();
    }

    function createId() {
        return "tx_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
    }

    function toTransaction(record) {
        var stamp = nowIso();
        return {
            id: typeof record.id === "string" && record.id ? record.id : createId(),
            description: String(record.description || "").trim(),
            amount: Number(record.amount || 0),
            category: String(record.category || "Food & Drink"),
            date: String(record.date || stamp.slice(0, 10)),
            receiptName: record.receiptName ? String(record.receiptName) : "",
            createdAt: String(record.createdAt || stamp),
            updatedAt: String(record.updatedAt || stamp)
        };
    }

    var DEFAULT_TRANSACTIONS = [
        toTransaction({ description: "Coffee Shop", amount: 4500, category: "Food & Drink", date: "2026-02-18" }),
        toTransaction({ description: "Gas Station", amount: 25000, category: "Transport", date: "2026-02-16" }),
        toTransaction({ description: "New Textbook", amount: 18000, category: "Books", date: "2026-02-14" }),
        toTransaction({ description: "Monthly Internet Bill", amount: 15000, category: "Food & Drink", date: "2026-02-12" }),
        toTransaction({ description: "Coffee lunch meetup", amount: 32500, category: "Transport", date: "2026-02-10" }),
        toTransaction({ description: "Restaurant Lunch", amount: 8500, category: "Food & Drink", date: "2026-02-08" }),
        toTransaction({ description: "Data Bundle", amount: 7000, category: "Data/Airtime", date: "2026-02-06" }),
        toTransaction({ description: "Semester Fees", amount: 7000, category: "Fees", date: "2026-02-04" }),
        toTransaction({ description: "Notebook Refill", amount: 12000, category: "Academic", date: "2026-01-29" }),
        toTransaction({ description: "Campus Laundry", amount: 9800, category: "Personal", date: "2026-01-21" }),
        toTransaction({ description: "Clinic Visit", amount: 5400, category: "Health", date: "2026-01-17" }),
        toTransaction({ description: "Utility Top Up", amount: 22000, category: "Utilities", date: "2026-01-12" })
    ];

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function sanitizeSettings(input) {
        var base = input || {};
        var budgetCap = Number(base.budgetCap);
        var usd = Number(base.usdToRwf);
        var eur = Number(base.eurToRwf);
        return {
            budgetCap: Number.isFinite(budgetCap) && budgetCap > 0 ? Math.round(budgetCap) : DEFAULT_SETTINGS.budgetCap,
            baseCurrency: ["RWF", "USD", "EUR"].indexOf(base.baseCurrency) > -1 ? base.baseCurrency : "RWF",
            usdToRwf: Number.isFinite(usd) && usd > 0 ? Math.round(usd) : DEFAULT_SETTINGS.usdToRwf,
            eurToRwf: Number.isFinite(eur) && eur > 0 ? Math.round(eur) : DEFAULT_SETTINGS.eurToRwf,
            caseSensitive: Boolean(base.caseSensitive)
        };
    }

    function sanitizeTransactions(list) {
        if (!Array.isArray(list)) {
            return clone(DEFAULT_TRANSACTIONS);
        }

        var out = [];
        for (var i = 0; i < list.length; i += 1) {
            var tx = toTransaction(list[i] || {});
            if (tx.description && Number.isFinite(tx.amount) && tx.amount > 0 && CATEGORIES.indexOf(tx.category) > -1) {
                out.push(tx);
            }
        }

        return out.length ? out : clone(DEFAULT_TRANSACTIONS);
    }

    function createInitialState(saved) {
        var base = saved || {};
        return {
            transactions: sanitizeTransactions(base.transactions),
            settings: sanitizeSettings(base.settings),
            ui: clone(DEFAULT_UI)
        };
    }

    function serializableState(state) {
        return {
            transactions: clone(state.transactions),
            settings: clone(state.settings)
        };
    }

    APP.State = {
        CATEGORIES: CATEGORIES,
        DEFAULT_SETTINGS: DEFAULT_SETTINGS,
        DEFAULT_UI: DEFAULT_UI,
        DEFAULT_TRANSACTIONS: DEFAULT_TRANSACTIONS,
        createInitialState: createInitialState,
        createId: createId,
        nowIso: nowIso,
        toTransaction: toTransaction,
        serializableState: serializableState
    };
})();
