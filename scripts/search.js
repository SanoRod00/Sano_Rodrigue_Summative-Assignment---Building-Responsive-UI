(function () {
    var APP = window.BudgetBuddy || (window.BudgetBuddy = {});

    function escapeHTML(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function escapeRegex(source) {
        return String(source || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    function compileRegex(query, caseSensitive) {
        var input = String(query || "").trim();
        if (!input) {
            return { regex: null, error: "", usedFallback: false };
        }

        var flags = caseSensitive ? "g" : "gi";
        try {
            return {
                regex: new RegExp(input, flags),
                error: "",
                usedFallback: false
            };
        } catch (_err) {
            return {
                regex: new RegExp(escapeRegex(input), flags),
                error: "Invalid regex pattern. Falling back to literal search.",
                usedFallback: true
            };
        }
    }

    function inRange(dateIso, range, pivotDate) {
        if (range === "all") {
            return true;
        }

        var txDate = new Date(dateIso + "T00:00:00");
        if (Number.isNaN(txDate.getTime())) {
            return false;
        }

        var pivot = pivotDate ? new Date(pivotDate + "T00:00:00") : new Date();
        pivot.setHours(0, 0, 0, 0);

        if (range === "this-month") {
            return txDate.getFullYear() === pivot.getFullYear() && txDate.getMonth() === pivot.getMonth();
        }

        var days = range === "last-90" ? 90 : 30;
        var start = new Date(pivot);
        start.setDate(start.getDate() - (days - 1));

        return txDate >= start && txDate <= pivot;
    }

    function sortTransactions(list, mode) {
        var items = list.slice();

        items.sort(function (a, b) {
            if (mode === "date_asc") {
                return a.date.localeCompare(b.date);
            }
            if (mode === "date_desc") {
                return b.date.localeCompare(a.date);
            }
            if (mode === "amount_asc") {
                return a.amount - b.amount;
            }
            if (mode === "amount_desc") {
                return b.amount - a.amount;
            }
            if (mode === "description_desc") {
                return b.description.localeCompare(a.description);
            }
            return a.description.localeCompare(b.description);
        });

        return items;
    }

    function filterTransactions(transactions, options) {
        var opts = options || {};
        var compiled = compileRegex(opts.search, !!opts.caseSensitive);

        var filtered = [];
        for (var i = 0; i < transactions.length; i += 1) {
            var tx = transactions[i];

            if (opts.category && opts.category !== "all" && tx.category !== opts.category) {
                continue;
            }

            if (!inRange(tx.date, opts.dateRange || "all", opts.pivotDate)) {
                continue;
            }

            if (compiled.regex) {
                compiled.regex.lastIndex = 0;
                var haystack = tx.description + " " + tx.category;
                if (!compiled.regex.test(haystack)) {
                    continue;
                }
            }

            filtered.push(tx);
        }

        return {
            regex: compiled.regex,
            regexError: compiled.error,
            rows: sortTransactions(filtered, opts.sort || "date_desc")
        };
    }

    function paginate(items, page, pageSize) {
        var size = Math.max(1, Number(pageSize) || 1);
        var totalItems = items.length;
        var totalPages = Math.max(1, Math.ceil(totalItems / size));
        var currentPage = Math.min(Math.max(1, Number(page) || 1), totalPages);
        var start = (currentPage - 1) * size;
        return {
            currentPage: currentPage,
            totalPages: totalPages,
            totalItems: totalItems,
            start: start,
            end: Math.min(totalItems, start + size),
            pageItems: items.slice(start, start + size)
        };
    }

    function highlightText(text, regex) {
        if (!regex) {
            return escapeHTML(text);
        }

        var source = String(text || "");
        var safeRegex = new RegExp(regex.source, regex.flags.indexOf("g") > -1 ? regex.flags : regex.flags + "g");
        var result = "";
        var lastIndex = 0;
        var guard = 0;
        var match;

        while ((match = safeRegex.exec(source)) && guard < 200) {
            guard += 1;
            var start = match.index;
            var end = start + (match[0] ? match[0].length : 0);

            if (end === start) {
                safeRegex.lastIndex += 1;
                continue;
            }

            result += escapeHTML(source.slice(lastIndex, start));
            result += "<mark>" + escapeHTML(source.slice(start, end)) + "</mark>";
            lastIndex = end;
        }

        result += escapeHTML(source.slice(lastIndex));
        return result;
    }

    APP.Search = {
        escapeHTML: escapeHTML,
        compileRegex: compileRegex,
        filterTransactions: filterTransactions,
        paginate: paginate,
        highlightText: highlightText
    };
})();
