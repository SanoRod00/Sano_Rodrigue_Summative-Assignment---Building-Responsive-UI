(function () {
    var APP = window.BudgetBuddy || (window.BudgetBuddy = {});

    var currencyFormatters = {};

    function getRefs() {
        return {
            live: document.getElementById("appLive"),
            goTopBtn: document.getElementById("goTopBtn"),
            viewButtons: Array.prototype.slice.call(document.querySelectorAll("[data-view-target]")),
            views: Array.prototype.slice.call(document.querySelectorAll(".workspace-view")),
            workspaceTitle: document.getElementById("workspace-title"),
            workspaceSubtitle: document.getElementById("workspace-subtitle"),

            dashboardPeriod: document.getElementById("dashboardPeriod"),
            spentValue: document.getElementById("spentValue"),
            remainingValue: document.getElementById("remainingValue"),
            transactionCountValue: document.getElementById("transactionCountValue"),
            budgetProgressFill: document.getElementById("budgetProgressFill"),
            progressRemainingText: document.getElementById("progressRemainingText"),
            progressStatus: document.getElementById("progressStatus"),
            spendList: document.getElementById("spendList"),
            weeklyBars: document.getElementById("weeklyBars"),
            insightTopCategory: document.getElementById("insightTopCategory"),
            insightBiggest: document.getElementById("insightBiggest"),
            insightSearchCount: document.getElementById("insightSearchCount"),

            txSearchInput: document.getElementById("txSearchInput"),
            caseSensitiveToggle: document.getElementById("caseSensitiveToggle"),
            categoryFilter: document.getElementById("categoryFilter"),
            dateRangeFilter: document.getElementById("dateRangeFilter"),
            sortSelect: document.getElementById("sortSelect"),
            regexError: document.getElementById("regexError"),
            resultsLine: document.getElementById("resultsLine"),
            transactionsTbody: document.getElementById("transactionsTbody"),
            pagination: document.getElementById("pagination"),

            budgetCap: document.getElementById("budgetCap"),
            budgetRemainingLine: document.getElementById("budgetRemainingLine"),
            budgetOverLine: document.getElementById("budgetOverLine"),
            baseCurrencySelect: document.getElementById("baseCurrencySelect"),
            usdRateInput: document.getElementById("usdRateInput"),
            eurRateInput: document.getElementById("eurRateInput"),
            settingsCaseSensitive: document.getElementById("settingsCaseSensitive"),
            importBtn: document.getElementById("importBtn"),
            exportBtn: document.getElementById("exportBtn"),
            importFileInput: document.getElementById("importFileInput"),
            resetDataBtn: document.getElementById("resetDataBtn"),

            openModalButtons: Array.prototype.slice.call(document.querySelectorAll("[data-open-modal]")),
            closeModalButtons: Array.prototype.slice.call(document.querySelectorAll("[data-close-modal]")),
            modal: document.getElementById("addModal"),
            modalTitle: document.getElementById("modal-title"),
            transactionForm: document.getElementById("transactionForm"),
            editTransactionId: document.getElementById("editTransactionId"),
            descriptionInput: document.getElementById("descriptionInput"),
            descriptionError: document.getElementById("descriptionError"),
            descriptionHint: document.getElementById("descriptionHint"),
            amountInput: document.getElementById("amountInput"),
            amountError: document.getElementById("amountError"),
            categoryInput: document.getElementById("categoryInput"),
            categoryError: document.getElementById("categoryError"),
            dateInput: document.getElementById("dateInput"),
            dateError: document.getElementById("dateError"),
            receiptInput: document.getElementById("receiptInput"),
            receiptTrigger: document.getElementById("receiptTrigger"),
            receiptName: document.getElementById("receiptName"),
            saveTransactionBtn: document.getElementById("saveTransactionBtn")
        };
    }

    function debounce(fn, wait) {
        var t;
        return function () {
            var args = arguments;
            clearTimeout(t);
            t = setTimeout(function () {
                fn.apply(null, args);
            }, wait);
        };
    }

    function formatDate(dateIso) {
        var date = new Date(dateIso + "T00:00:00");
        if (Number.isNaN(date.getTime())) {
            return dateIso;
        }
        return date.toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric"
        });
    }

    function getFormatter(currency) {
        if (!currencyFormatters[currency]) {
            currencyFormatters[currency] = new Intl.NumberFormat(undefined, {
                style: "currency",
                currency: currency,
                maximumFractionDigits: currency === "RWF" ? 0 : 2
            });
        }
        return currencyFormatters[currency];
    }

    function formatMoneyFromRwf(amountRwf, settings) {
        var value = Number(amountRwf) || 0;
        var base = settings.baseCurrency;

        if (base === "USD") {
            return getFormatter("USD").format(value / settings.usdToRwf);
        }
        if (base === "EUR") {
            return getFormatter("EUR").format(value / settings.eurToRwf);
        }

        return Math.round(value).toLocaleString() + " RWF";
    }

    function badgeClassForCategory(category) {
        var softRed = ["Food & Drink", "Fees", "Health"];
        if (softRed.indexOf(category) > -1) {
            return "soft-red";
        }
        return "soft-blue";
    }

    function setLiveMessage(refs, message) {
        if (!refs.live) {
            return;
        }
        refs.live.textContent = "";
        window.setTimeout(function () {
            refs.live.textContent = message;
        }, 10);
    }

    function setView(refs, viewName, viewMeta) {
        refs.views.forEach(function (view) {
            var active = view.dataset.view === viewName;
            view.classList.toggle("active", active);
        });

        refs.viewButtons.forEach(function (button) {
            var active = button.dataset.viewTarget === viewName;
            button.classList.toggle("active", active);
            if (button.classList.contains("chip")) {
                button.setAttribute("aria-selected", String(active));
            }
        });

        refs.workspaceTitle.textContent = viewMeta.title;
        refs.workspaceSubtitle.textContent = viewMeta.subtitle;
    }

    function renderOptions(select, values, selectedValue) {
        var html = "";
        for (var i = 0; i < values.length; i += 1) {
            var item = values[i];
            var value = typeof item === "string" ? item : item.value;
            var label = typeof item === "string" ? item : item.label;
            var selected = value === selectedValue ? " selected" : "";
            html += "<option value=\"" + APP.Search.escapeHTML(value) + "\"" + selected + ">" + APP.Search.escapeHTML(label) + "</option>";
        }
        select.innerHTML = html;
    }

    function renderSpendList(refs, totals, totalSpend, settings) {
        if (!totals.length) {
            refs.spendList.innerHTML = "<li class=\"empty-row\"><span>No spending data yet.</span></li>";
            return;
        }

        var html = "";
        for (var i = 0; i < totals.length; i += 1) {
            var item = totals[i];
            var pct = totalSpend > 0 ? Math.round((item.amount / totalSpend) * 100) : 0;
            html +=
                "<li>" +
                "<span>" + APP.Search.escapeHTML(item.category) + "</span>" +
                "<div class=\"meter\"><i style=\"width:" + pct + "%\"></i></div>" +
                "<strong>" + APP.Search.escapeHTML(formatMoneyFromRwf(item.amount, settings)) + "</strong>" +
                "</li>";
        }

        refs.spendList.innerHTML = html;
    }

    function renderWeeklyBars(refs, dayTotals) {
        if (!dayTotals.length) {
            refs.weeklyBars.innerHTML = "";
            return;
        }

        var max = 0;
        for (var i = 0; i < dayTotals.length; i += 1) {
            if (dayTotals[i].amount > max) {
                max = dayTotals[i].amount;
            }
        }

        if (max <= 0) {
            max = 1;
        }

        var html = "";
        for (var j = 0; j < dayTotals.length; j += 1) {
            var ratio = Math.max(10, Math.round((dayTotals[j].amount / max) * 100));
            html += "<span title=\"" + APP.Search.escapeHTML(dayTotals[j].label + ": " + dayTotals[j].amount) + "\" style=\"height:" + ratio + "%\"></span>";
        }
        refs.weeklyBars.innerHTML = html;
    }

    function renderTableRows(refs, rows, regex, settings) {
        if (!rows.length) {
            refs.transactionsTbody.innerHTML =
                "<tr><td colspan=\"5\" class=\"empty-row\">No transactions found. Try changing filters.</td></tr>";
            return;
        }

        var html = "";
        for (var i = 0; i < rows.length; i += 1) {
            var tx = rows[i];
            html +=
                "<tr>" +
                "<td>" + APP.Search.escapeHTML(formatDate(tx.date)) + "</td>" +
                "<td>" + APP.Search.highlightText(tx.description, regex) + "</td>" +
                "<td><span class=\"badge " + badgeClassForCategory(tx.category) + "\">" + APP.Search.escapeHTML(tx.category) + "</span></td>" +
                "<td class=\"amount-cell\">-" + APP.Search.escapeHTML(formatMoneyFromRwf(tx.amount, settings)) + "</td>" +
                "<td><button type=\"button\" class=\"edit-btn\" data-edit-id=\"" + APP.Search.escapeHTML(tx.id) + "\">Edit</button></td>" +
                "</tr>";
        }

        refs.transactionsTbody.innerHTML = html;
    }

    function renderPagination(refs, page) {
        if (page.totalPages <= 1) {
            refs.pagination.innerHTML = "";
            return;
        }

        var html = "";
        html += "<button type=\"button\" data-page=\"" + (page.currentPage - 1) + "\" " + (page.currentPage === 1 ? "disabled" : "") + ">Previous</button>";

        for (var p = 1; p <= page.totalPages; p += 1) {
            var activeClass = p === page.currentPage ? " class=\"active\"" : "";
            html += "<button type=\"button\" data-page=\"" + p + "\"" + activeClass + ">" + p + "</button>";
        }

        html += "<button type=\"button\" data-page=\"" + (page.currentPage + 1) + "\" " + (page.currentPage === page.totalPages ? "disabled" : "") + ">Next</button>";
        refs.pagination.innerHTML = html;
    }

    function clearModalErrors(refs) {
        refs.descriptionError.hidden = true;
        refs.amountError.hidden = true;
        refs.categoryError.hidden = true;
        refs.dateError.hidden = true;

        refs.descriptionError.textContent = "";
        refs.amountError.textContent = "";
        refs.categoryError.textContent = "";
        refs.dateError.textContent = "";
        refs.descriptionHint.textContent = "";
    }

    APP.UI = {
        getRefs: getRefs,
        debounce: debounce,
        formatDate: formatDate,
        formatMoneyFromRwf: formatMoneyFromRwf,
        badgeClassForCategory: badgeClassForCategory,
        setLiveMessage: setLiveMessage,
        setView: setView,
        renderOptions: renderOptions,
        renderSpendList: renderSpendList,
        renderWeeklyBars: renderWeeklyBars,
        renderTableRows: renderTableRows,
        renderPagination: renderPagination,
        clearModalErrors: clearModalErrors
    };
})();
