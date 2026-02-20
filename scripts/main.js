(function () {
    document.addEventListener("DOMContentLoaded", function () {
        var APP = window.BudgetBuddy || {};
        var State = APP.State;
        var Storage = APP.Storage;
        var Validators = APP.Validators;
        var Search = APP.Search;
        var UI = APP.UI;

        if (!State || !Storage || !Validators || !Search || !UI) {
            return;
        }

        var refs = UI.getRefs();
        var persisted = Storage.load();
        var state = State.createInitialState(persisted);
        if (Storage.isAvailable && !Storage.isAvailable()) {
            UI.setLiveMessage(refs, "Local storage is unavailable. Your data will not be saved.");
        }

        var viewMeta = {
            dashboard: {
                title: "Dashboard",
                subtitle: "Track spending. Stay under budget."
            },
            transactions: {
                title: "Transactions",
                subtitle: "Search, sort, and review every expense."
            },
            settings: {
                title: "Settings",
                subtitle: "Manage budget controls and data preferences."
            }
        };

        var initialView = document.body && document.body.dataset ? document.body.dataset.initialView : "";
        var hashView = window.location.hash ? window.location.hash.replace("#", "") : "";
        var preferredView = "";
        if (hashView && viewMeta[hashView]) {
            preferredView = hashView;
        } else if (initialView && viewMeta[initialView]) {
            preferredView = initialView;
        }
        state.ui.view = resolveView(preferredView || state.ui.view);
        state.ui.modalOpen = false;

        var modalDraft = {
            id: "",
            description: "",
            amount: "",
            category: State.CATEGORIES[0],
            date: todayIso(),
            receiptName: ""
        };
        var modalStartSnapshot = null;
        var modalDirty = false;
        var closeAttemptLocked = false;

        var renderQueued = false;

        function todayIso() {
            return new Date().toISOString().slice(0, 10);
        }

        function persistState() {
            Storage.save(State.serializableState(state));
        }

        function queueRender() {
            if (renderQueued) {
                return;
            }
            renderQueued = true;
            requestAnimationFrame(function () {
                renderQueued = false;
                render();
            });
        }

        function viewExists(viewName) {
            if (!refs.views || !refs.views.length) {
                return false;
            }
            return refs.views.some(function (view) {
                return view.dataset.view === viewName;
            });
        }

        function resolveView(viewName) {
            if (viewExists(viewName)) {
                return viewName;
            }
            if (refs.views && refs.views.length) {
                return refs.views[0].dataset.view || "dashboard";
            }
            return "dashboard";
        }

        function setBodyViewClass(viewName) {
            var target = viewName || "home";
            document.body.classList.remove("view-home", "view-dashboard", "view-transactions", "view-settings");
            document.body.classList.add("view-" + target);
        }

        function hashToView() {
            var hash = window.location.hash ? window.location.hash.replace("#", "") : "";
            if (hash === "dashboard" || hash === "transactions" || hash === "settings") {
                return hash;
            }
            return "home";
        }

        function getPivotDate() {
            if (!state.transactions.length) {
                return todayIso();
            }

            var max = state.transactions[0].date;
            for (var i = 1; i < state.transactions.length; i += 1) {
                if (state.transactions[i].date > max) {
                    max = state.transactions[i].date;
                }
            }
            return max;
        }

        function getMonthTransactions(pivotDate) {
            var monthKey = pivotDate.slice(0, 7);
            return state.transactions.filter(function (tx) {
                return tx.date.slice(0, 7) === monthKey;
            });
        }

        function sumAmounts(rows) {
            var total = 0;
            for (var i = 0; i < rows.length; i += 1) {
                total += Number(rows[i].amount) || 0;
            }
            return total;
        }

        function getCategoryTotals(rows) {
            var map = Object.create(null);
            for (var i = 0; i < rows.length; i += 1) {
                var tx = rows[i];
                map[tx.category] = (map[tx.category] || 0) + tx.amount;
            }

            var totals = [];
            for (var key in map) {
                if (Object.prototype.hasOwnProperty.call(map, key)) {
                    totals.push({ category: key, amount: map[key] });
                }
            }

            totals.sort(function (a, b) {
                return b.amount - a.amount;
            });

            return totals;
        }

        function getTransactionView() {
            var pivotDate = getPivotDate();
            var filtered = Search.filterTransactions(state.transactions, {
                search: state.ui.search,
                caseSensitive: state.settings.caseSensitive,
                category: state.ui.category,
                dateRange: state.ui.dateRange,
                sort: state.ui.sort,
                pivotDate: pivotDate
            });

            var page = Search.paginate(filtered.rows, state.ui.page, state.ui.pageSize);
            state.ui.page = page.currentPage;
            state.ui.regexError = filtered.regexError;

            return {
                pivotDate: pivotDate,
                filteredRows: filtered.rows,
                page: page,
                regex: filtered.regex
            };
        }

        function renderDashboard(viewData) {
            if (!refs.dashboardPeriod) {
                return;
            }
            var monthRows = getMonthTransactions(viewData.pivotDate);
            var monthSpent = sumAmounts(monthRows);
            var remaining = state.settings.budgetCap - monthSpent;
            var progress = state.settings.budgetCap > 0 ? Math.min(100, (monthSpent / state.settings.budgetCap) * 100) : 0;
            var monthDate = new Date(viewData.pivotDate + "T00:00:00");

            refs.dashboardPeriod.textContent =
                "This month (" + monthDate.toLocaleDateString(undefined, { month: "short", year: "numeric" }) + ")";

            refs.spentValue.textContent = UI.formatMoneyFromRwf(monthSpent, state.settings);
            if (refs.remainingLabel) {
                refs.remainingLabel.textContent = remaining >= 0 ? "Remaining" : "Over budget";
            }
            refs.remainingValue.textContent = UI.formatMoneyFromRwf(Math.abs(remaining), state.settings);
            refs.remainingValue.classList.toggle("danger", remaining < 0);
            refs.remainingValue.classList.toggle("safe", remaining >= 0);
            refs.transactionCountValue.textContent = String(monthRows.length);

            refs.budgetProgressFill.style.width = progress.toFixed(1) + "%";
            refs.progressRemainingText.innerHTML =
                "<strong>" +
                (remaining >= 0 ? "Remaining:" : "Over by:") +
                "</strong> " +
                UI.formatMoneyFromRwf(Math.abs(remaining), state.settings);

            if (remaining >= 0) {
                refs.progressStatus.textContent = "On track";
                refs.progressStatus.classList.add("on-track");
                refs.progressStatus.classList.remove("over");
            } else {
                refs.progressStatus.textContent = "Over budget";
                refs.progressStatus.classList.add("over");
                refs.progressStatus.classList.remove("on-track");
            }

            var categoryTotals = getCategoryTotals(monthRows);
            UI.renderSpendList(refs, categoryTotals.slice(0, 6), monthSpent, state.settings);
            if (categoryTotals.length) {
                var top = categoryTotals[0];
                var pct = monthSpent > 0 ? Math.round((top.amount / monthSpent) * 100) : 0;
                refs.insightTopCategory.textContent =
                    "Top category: " + top.category + " (" + pct + "%)";
            } else {
                refs.insightTopCategory.textContent = "Top category: None";
            }

            if (state.transactions.length) {
                var biggest = state.transactions.slice().sort(function (a, b) {
                    return b.amount - a.amount;
                })[0];
                refs.insightBiggest.textContent =
                    "Biggest transaction: " +
                    biggest.description +
                    " (" +
                    UI.formatMoneyFromRwf(biggest.amount, state.settings) +
                    ")";
            } else {
                refs.insightBiggest.textContent = "Biggest transaction: None";
            }

            refs.insightSearchCount.textContent =
                "Matches for current search: " + viewData.filteredRows.length;

            updateBudgetStatus(remaining);
        }

        function updateBudgetStatus(remaining) {
            if (!refs.budgetRemainingLine || !refs.budgetOverLine) {
                return;
            }
            var remainingClamped = Math.max(0, remaining);
            refs.budgetRemainingLine.innerHTML =
                "Remaining this month: <strong>" +
                Search.escapeHTML(UI.formatMoneyFromRwf(remainingClamped, state.settings)) +
                "</strong>";
            if (remaining < 0) {
                refs.budgetOverLine.hidden = false;
                refs.budgetOverLine.textContent =
                    "Over budget by " + UI.formatMoneyFromRwf(Math.abs(remaining), state.settings);
            } else {
                refs.budgetOverLine.hidden = true;
            }
        }

        function renderTransactions(viewData) {
            if (!refs.txSearchInput) {
                return;
            }
            refs.txSearchInput.value = state.ui.search;
            if (refs.caseSensitiveToggle) {
                refs.caseSensitiveToggle.checked = state.settings.caseSensitive;
            }
            if (refs.settingsCaseSensitive) {
                refs.settingsCaseSensitive.checked = state.settings.caseSensitive;
            }
            if (refs.categoryFilter) {
                refs.categoryFilter.value = state.ui.category;
            }
            if (refs.dateRangeFilter) {
                refs.dateRangeFilter.value = state.ui.dateRange;
            }
            if (refs.sortSelect) {
                refs.sortSelect.value = state.ui.sort;
            }

            if (refs.regexError) {
                refs.regexError.hidden = !state.ui.regexError;
                refs.regexError.textContent = state.ui.regexError;
            }

            var page = viewData.page;
            var filteredTotalSpent = sumAmounts(viewData.filteredRows);
            var baseLine =
                "Showing " +
                (page.totalItems ? page.start + 1 : 0) +
                "-" +
                page.end +
                " of " +
                page.totalItems +
                " transactions";

            if (state.ui.search.trim()) {
                baseLine += " matched '" + state.ui.search.trim() + "'";
            }

            baseLine += " - Total Spent: " + UI.formatMoneyFromRwf(filteredTotalSpent, state.settings);
            if (refs.resultsLine) {
                refs.resultsLine.textContent = baseLine;
            }

            UI.renderTableRows(refs, page.pageItems, viewData.regex, state.settings);
            UI.renderPagination(refs, page);
        }

        function renderSettings() {
            if (!refs.budgetCap) {
                return;
            }
            refs.budgetCap.value = String(state.settings.budgetCap);
            refs.baseCurrencySelect.value = state.settings.baseCurrency;
            refs.usdRateInput.value = String(state.settings.usdToRwf);
            refs.eurRateInput.value = String(state.settings.eurToRwf);

            var pivotDate = getPivotDate();
            var monthRows = getMonthTransactions(pivotDate);
            var monthSpent = sumAmounts(monthRows);
            var remaining = state.settings.budgetCap - monthSpent;
            updateBudgetStatus(remaining);
        }

        function renderModal() {
            if (!refs.modal) {
                return;
            }
            refs.modal.hidden = !state.ui.modalOpen;
            document.body.classList.toggle("modal-open", state.ui.modalOpen);
            if (!state.ui.modalOpen) {
                return;
            }

            var isEditing = !!state.ui.editingId;
            refs.modalTitle.textContent = isEditing ? "Edit Transaction" : "Add Transaction";
            refs.saveTransactionBtn.textContent = isEditing ? "Save Changes" : "Add Transaction";
            if (refs.deleteTransactionBtn) {
                refs.deleteTransactionBtn.hidden = !isEditing;
            }

            refs.editTransactionId.value = modalDraft.id || "";
            refs.descriptionInput.value = modalDraft.description || "";
            refs.amountInput.value = modalDraft.amount || "";
            refs.categoryInput.value = modalDraft.category || State.CATEGORIES[0];
            refs.dateInput.value = modalDraft.date || todayIso();
            refs.receiptName.textContent = modalDraft.receiptName || "No file selected";
        }

        function getDraftSnapshot(values) {
            var source = values || {};
            return {
                description: String(source.description || ""),
                amount: String(source.amount || ""),
                category: String(source.category || ""),
                date: String(source.date || ""),
                receiptName: String(source.receiptName || "")
            };
        }

        function getCurrentModalSnapshot() {
            return getDraftSnapshot({
                description: refs.descriptionInput.value,
                amount: refs.amountInput.value,
                category: refs.categoryInput.value,
                date: refs.dateInput.value,
                receiptName: modalDraft.receiptName
            });
        }

        function hasUnsavedModalChanges() {
            if (!state.ui.modalOpen || !modalStartSnapshot) {
                return false;
            }
            if (modalDirty) {
                return true;
            }
            return JSON.stringify(getCurrentModalSnapshot()) !== JSON.stringify(modalStartSnapshot);
        }

        function render() {
            var resolvedView = resolveView(state.ui.view);
            if (state.ui.view !== resolvedView) {
                state.ui.view = resolvedView;
            }
            setBodyViewClass(hashToView());
            var meta = viewMeta[resolvedView] || viewMeta.dashboard;
            UI.setView(refs, resolvedView, meta);

            var viewData = getTransactionView();
            renderDashboard(viewData);
            renderTransactions(viewData);
            renderSettings();
            renderModal();
        }

        function openModal(editId) {
            if (!refs.transactionForm || !refs.modal) {
                return;
            }
            UI.clearModalErrors(refs);
            refs.transactionForm.reset();

            if (editId) {
                var target = state.transactions.find(function (tx) {
                    return tx.id === editId;
                });

                if (!target) {
                    return;
                }

                modalDraft = {
                    id: target.id,
                    description: target.description,
                    amount: String(target.amount),
                    category: target.category,
                    date: target.date,
                    receiptName: target.receiptName || ""
                };
                state.ui.editingId = editId;
            } else {
                modalDraft = {
                    id: "",
                    description: "",
                    amount: "",
                    category: State.CATEGORIES[0],
                    date: getPivotDate(),
                    receiptName: ""
                };
                state.ui.editingId = "";
            }

            refs.receiptInput.value = "";
            state.ui.modalOpen = true;
            modalDirty = false;
            modalStartSnapshot = getDraftSnapshot(modalDraft);
            queueRender();
            setTimeout(function () {
                refs.descriptionInput.focus();
            }, 20);
        }

        function closeModal(forceClose) {
            if (!forceClose && hasUnsavedModalChanges()) {
                var shouldExit = window.confirm("You have unsaved changes. Exit this form anyway?");
                if (!shouldExit) {
                    return false;
                }
            }
            state.ui.modalOpen = false;
            state.ui.editingId = "";
            modalDirty = false;
            modalStartSnapshot = null;
            queueRender();
            return true;
        }

        function requestCloseModal(forceClose) {
            if (closeAttemptLocked) {
                return false;
            }
            closeAttemptLocked = true;
            var didClose = closeModal(!!forceClose);
            setTimeout(function () {
                closeAttemptLocked = false;
            }, 0);
            return didClose;
        }

        function applySettingsPatch(patch) {
            state.settings = Object.assign({}, state.settings, patch);
            persistState();
            queueRender();
        }

        function populateOptions() {
            if (refs.categoryFilter) {
                UI.renderOptions(
                    refs.categoryFilter,
                    [{ value: "all", label: "All Categories" }].concat(State.CATEGORIES),
                    state.ui.category
                );
            }
            if (refs.categoryInput) {
                UI.renderOptions(refs.categoryInput, State.CATEGORIES, modalDraft.category);
            }
        }

        function bindEvents() {
            window.BudgetBuddyCloseModal = function (forceClose) {
                return requestCloseModal(!!forceClose);
            };

            refs.viewButtons.forEach(function (button) {
                button.addEventListener("click", function () {
                    state.ui.view = button.dataset.viewTarget;
                    queueRender();
                });
            });

            window.addEventListener("hashchange", function () {
                var nextHash = window.location.hash ? window.location.hash.replace("#", "") : "";
                if (nextHash && viewMeta[nextHash] && viewExists(nextHash)) {
                    state.ui.view = nextHash;
                    queueRender();
                }
                setBodyViewClass(hashToView());
            });

            refs.openModalButtons.forEach(function (button) {
                button.addEventListener("click", function () {
                    openModal("");
                });
            });

            refs.closeModalButtons.forEach(function (button) {
                button.addEventListener("click", function (event) {
                    event.preventDefault();
                    requestCloseModal(false);
                });
            });

            if (refs.modal) {
                refs.modal.addEventListener("click", function (event) {
                    if (event.target === refs.modal) {
                        requestCloseModal(false);
                    }
                });
            }

            document.addEventListener("keydown", function (event) {
                if (event.key === "Escape" && state.ui.modalOpen) {
                    requestCloseModal(false);
                }
            });

            var updateSearch = UI.debounce(function (value) {
                state.ui.search = value;
                state.ui.page = 1;
                queueRender();
            }, 100);

            if (refs.txSearchInput) {
                refs.txSearchInput.addEventListener("input", function (event) {
                    updateSearch(event.target.value);
                });
            }

            if (refs.caseSensitiveToggle) {
                refs.caseSensitiveToggle.addEventListener("change", function (event) {
                    applySettingsPatch({ caseSensitive: event.target.checked });
                    UI.setLiveMessage(refs, "Search case sensitivity updated.");
                });
            }

            if (refs.settingsCaseSensitive) {
                refs.settingsCaseSensitive.addEventListener("change", function (event) {
                    applySettingsPatch({ caseSensitive: event.target.checked });
                    UI.setLiveMessage(refs, "Search case sensitivity updated.");
                });
            }

            if (refs.categoryFilter) {
                refs.categoryFilter.addEventListener("change", function (event) {
                    state.ui.category = event.target.value;
                    state.ui.page = 1;
                    queueRender();
                });
            }

            if (refs.dateRangeFilter) {
                refs.dateRangeFilter.addEventListener("change", function (event) {
                    state.ui.dateRange = event.target.value;
                    state.ui.page = 1;
                    queueRender();
                });
            }

            if (refs.sortSelect) {
                refs.sortSelect.addEventListener("change", function (event) {
                    state.ui.sort = event.target.value;
                    state.ui.page = 1;
                    queueRender();
                });
            }

            if (refs.pagination) {
                refs.pagination.addEventListener("click", function (event) {
                    var button = event.target.closest("button[data-page]");
                    if (!button || button.disabled) {
                        return;
                    }

                    var nextPage = Number(button.dataset.page);
                    if (!Number.isFinite(nextPage) || nextPage < 1) {
                        return;
                    }

                    state.ui.page = nextPage;
                    queueRender();
                });
            }

            if (refs.transactionsTbody) {
                refs.transactionsTbody.addEventListener("click", function (event) {
                    var editButton = event.target.closest("button[data-edit-id]");
                    if (!editButton) {
                        return;
                    }
                    openModal(editButton.dataset.editId);
                });
            }

            if (refs.budgetCap) {
                refs.budgetCap.addEventListener("change", function () {
                    var value = Number(refs.budgetCap.value);
                    if (!Number.isFinite(value) || value <= 0) {
                        refs.budgetCap.value = String(state.settings.budgetCap);
                        return;
                    }
                    applySettingsPatch({ budgetCap: Math.round(value) });
                    UI.setLiveMessage(refs, "Budget cap updated.");
                });
            }

            if (refs.baseCurrencySelect) {
                refs.baseCurrencySelect.addEventListener("change", function () {
                    applySettingsPatch({ baseCurrency: refs.baseCurrencySelect.value });
                    UI.setLiveMessage(refs, "Base currency updated.");
                });
            }

            if (refs.usdRateInput) {
                refs.usdRateInput.addEventListener("change", function () {
                    var value = Number(refs.usdRateInput.value);
                    if (!Number.isFinite(value) || value <= 0) {
                        refs.usdRateInput.value = String(state.settings.usdToRwf);
                        return;
                    }
                    applySettingsPatch({ usdToRwf: Math.round(value) });
                    UI.setLiveMessage(refs, "USD conversion rate updated.");
                });
            }

            if (refs.eurRateInput) {
                refs.eurRateInput.addEventListener("change", function () {
                    var value = Number(refs.eurRateInput.value);
                    if (!Number.isFinite(value) || value <= 0) {
                        refs.eurRateInput.value = String(state.settings.eurToRwf);
                        return;
                    }
                    applySettingsPatch({ eurToRwf: Math.round(value) });
                    UI.setLiveMessage(refs, "EUR conversion rate updated.");
                });
            }

            if (refs.exportBtn) {
                refs.exportBtn.addEventListener("click", function () {
                    Storage.exportJSON(State.serializableState(state));
                    UI.setLiveMessage(refs, "Data exported successfully.");
                });
            }

            if (refs.importBtn && refs.importFileInput) {
                refs.importBtn.addEventListener("click", function () {
                    refs.importFileInput.click();
                });
            }

            if (refs.importFileInput) {
                refs.importFileInput.addEventListener("change", function (event) {
                    var file = event.target.files && event.target.files[0];
                    Storage.importJSONFile(file)
                        .then(function (data) {
                            state = State.createInitialState(data);
                            if (viewExists("transactions")) {
                                state.ui.view = "transactions";
                            }
                            populateOptions();
                            persistState();
                            queueRender();
                            UI.setLiveMessage(refs, "Data imported successfully.");
                        })
                        .catch(function (error) {
                            UI.setLiveMessage(refs, error.message);
                        })
                        .finally(function () {
                            refs.importFileInput.value = "";
                        });
                });
            }

            if (refs.resetDataBtn) {
                refs.resetDataBtn.addEventListener("click", function () {
                    if (!window.confirm("Reset all transactions and settings? This cannot be undone.")) {
                        return;
                    }
                    state = State.createInitialState(null);
                    Storage.clear();
                    persistState();
                    populateOptions();
                    queueRender();
                    UI.setLiveMessage(refs, "All data was reset.");
                });
            }

            if (refs.receiptTrigger && refs.receiptInput) {
                refs.receiptTrigger.addEventListener("click", function () {
                    refs.receiptInput.click();
                });
            }

            if (refs.receiptInput) {
                refs.receiptInput.addEventListener("change", function () {
                    var file = refs.receiptInput.files && refs.receiptInput.files[0];
                    modalDraft.receiptName = file ? file.name : "";
                    modalDirty = true;
                    if (refs.receiptName) {
                        refs.receiptName.textContent = modalDraft.receiptName || "No file selected";
                    }
                });
            }

            if (refs.deleteTransactionBtn) {
                refs.deleteTransactionBtn.addEventListener("click", function () {
                    if (!state.ui.editingId) {
                        return;
                    }
                    if (!window.confirm("Delete this transaction? This cannot be undone.")) {
                        return;
                    }
                    var targetId = state.ui.editingId;
                    state.transactions = state.transactions.filter(function (tx) {
                        return tx.id !== targetId;
                    });
                    state.ui.editingId = "";
                    if (viewExists("transactions")) {
                        state.ui.view = "transactions";
                    }
                    state.ui.page = 1;
                    persistState();
                    UI.setLiveMessage(refs, "Transaction deleted.");
                    requestCloseModal(true);
                });
            }

            if (refs.transactionForm) {
                refs.transactionForm.addEventListener("input", function () {
                    if (state.ui.modalOpen) {
                        modalDirty = true;
                    }
                });

                refs.transactionForm.addEventListener("change", function () {
                    if (state.ui.modalOpen) {
                        modalDirty = true;
                    }
                });

                refs.transactionForm.addEventListener("submit", function (event) {
                    event.preventDefault();
                    UI.clearModalErrors(refs);

                    var input = {
                        description: refs.descriptionInput.value,
                        amount: refs.amountInput.value,
                        category: refs.categoryInput.value,
                        date: refs.dateInput.value,
                        receiptName: modalDraft.receiptName
                    };

                    var validation = Validators.validateTransactionInput(input, State.CATEGORIES);

                    refs.descriptionHint.textContent = validation.hints.description || "";

                    if (!validation.isValid) {
                        if (validation.errors.description) {
                            refs.descriptionError.hidden = false;
                            refs.descriptionError.textContent = validation.errors.description;
                        }
                        if (validation.errors.amount) {
                            refs.amountError.hidden = false;
                            refs.amountError.textContent = validation.errors.amount;
                        }
                        if (validation.errors.category) {
                            refs.categoryError.hidden = false;
                            refs.categoryError.textContent = validation.errors.category;
                        }
                        if (validation.errors.date) {
                            refs.dateError.hidden = false;
                            refs.dateError.textContent = validation.errors.date;
                        }
                        return;
                    }

                    var now = State.nowIso();
                    if (state.ui.editingId) {
                        state.transactions = state.transactions.map(function (tx) {
                            if (tx.id !== state.ui.editingId) {
                                return tx;
                            }
                            return {
                                id: tx.id,
                                description: validation.values.description,
                                amount: validation.values.amount,
                                category: validation.values.category,
                                date: validation.values.date,
                                receiptName: validation.values.receiptName,
                                createdAt: tx.createdAt,
                                updatedAt: now
                            };
                        });

                        UI.setLiveMessage(refs, "Transaction updated.");
                    } else {
                        state.transactions.unshift(
                            State.toTransaction({
                                id: State.createId(),
                                description: validation.values.description,
                                amount: validation.values.amount,
                                category: validation.values.category,
                                date: validation.values.date,
                                receiptName: validation.values.receiptName,
                                createdAt: now,
                                updatedAt: now
                            })
                        );

                        UI.setLiveMessage(refs, "Transaction added.");
                    }

                    if (viewExists("transactions")) {
                        state.ui.view = "transactions";
                    }
                    state.ui.page = 1;

                    persistState();
                    requestCloseModal(true);
                });
            }
        }

        populateOptions();
        bindEvents();
        persistState();
        queueRender();
    });
})();
