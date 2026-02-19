(function () {
    var APP = window.BudgetBuddy || (window.BudgetBuddy = {});

    var DESCRIPTION_PATTERN = /^[a-zA-Z0-9\s.,'-]{3,50}$/;
    var AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;
    var DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
    var REPEATED_WORD_PATTERN = /\b(\w+)\s+\1\b/i;

    function sanitizeDescription(text) {
        return String(text || "").replace(/\s+/g, " ").trim();
    }

    function parseAmount(value) {
        var raw = String(value || "").trim();
        if (!AMOUNT_PATTERN.test(raw)) {
            return NaN;
        }
        return Number(raw);
    }

    function isValidDate(value) {
        if (!DATE_PATTERN.test(String(value || ""))) {
            return false;
        }
        var date = new Date(value + "T00:00:00Z");
        return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
    }

    function validateTransactionInput(input, categories) {
        var source = input || {};
        var errors = {
            description: "",
            amount: "",
            category: "",
            date: ""
        };

        var hints = {
            description: ""
        };

        var descriptionRaw = String(source.description || "");
        var description = sanitizeDescription(descriptionRaw);

        if (!description) {
            errors.description = "Description is required.";
        } else if (!DESCRIPTION_PATTERN.test(description)) {
            errors.description = "Use 3-50 chars: letters, numbers, spaces, and . , ' -";
        } else if (REPEATED_WORD_PATTERN.test(description)) {
            errors.description = "Avoid repeated words in the description.";
            hints.description = "Looks like you repeated a word.";
        } else if (descriptionRaw !== description) {
            hints.description = "Leading/trailing spaces removed and extra spaces collapsed.";
        }

        var amount = parseAmount(source.amount);
        if (!Number.isFinite(amount) || amount <= 0) {
            errors.amount = "Amount must be a positive number (up to 2 decimals).";
        }

        var category = String(source.category || "");
        if (!category || categories.indexOf(category) === -1) {
            errors.category = "Please select a valid category.";
        }

        var date = String(source.date || "");
        if (!isValidDate(date)) {
            errors.date = "Date must be YYYY-MM-DD.";
        }

        return {
            isValid: !errors.description && !errors.amount && !errors.category && !errors.date,
            errors: errors,
            hints: hints,
            values: {
                description: description,
                amount: Number.isFinite(amount) ? amount : 0,
                category: category,
                date: date,
                receiptName: source.receiptName ? String(source.receiptName) : ""
            }
        };
    }

    APP.Validators = {
        DESCRIPTION_PATTERN: DESCRIPTION_PATTERN,
        AMOUNT_PATTERN: AMOUNT_PATTERN,
        DATE_PATTERN: DATE_PATTERN,
        REPEATED_WORD_PATTERN: REPEATED_WORD_PATTERN,
        sanitizeDescription: sanitizeDescription,
        parseAmount: parseAmount,
        isValidDate: isValidDate,
        validateTransactionInput: validateTransactionInput
    };
})();
