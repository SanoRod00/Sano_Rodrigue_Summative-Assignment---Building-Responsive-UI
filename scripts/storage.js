(function () {
    var APP = window.BudgetBuddy || (window.BudgetBuddy = {});
    var STORAGE_KEY = "budgetbuddy.v3";

    function parseJSON(text) {
        try {
            return JSON.parse(text);
        } catch (_err) {
            return null;
        }
    }

    function load() {
        try {
            var raw = window.localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                return null;
            }
            return parseJSON(raw);
        } catch (_err) {
            return null;
        }
    }

    function save(stateLike) {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stateLike));
            return true;
        } catch (_err) {
            return false;
        }
    }

    function clear() {
        try {
            window.localStorage.removeItem(STORAGE_KEY);
            return true;
        } catch (_err) {
            return false;
        }
    }

    function exportJSON(payload) {
        var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        var date = new Date().toISOString().slice(0, 10);

        a.href = url;
        a.download = "budgetbuddy-backup-" + date + ".json";
        document.body.appendChild(a);
        a.click();
        a.remove();

        setTimeout(function () {
            URL.revokeObjectURL(url);
        }, 500);
    }

    function importJSONFile(file) {
        return new Promise(function (resolve, reject) {
            if (!file) {
                reject(new Error("No file selected."));
                return;
            }

            if (file.type && file.type !== "application/json" && !file.name.endsWith(".json")) {
                reject(new Error("Please choose a valid JSON file."));
                return;
            }

            var reader = new FileReader();
            reader.onload = function (event) {
                var parsed = parseJSON(String(event.target.result || ""));
                if (!parsed || typeof parsed !== "object") {
                    reject(new Error("Invalid JSON content."));
                    return;
                }
                resolve(parsed);
            };
            reader.onerror = function () {
                reject(new Error("Failed to read file."));
            };
            reader.readAsText(file);
        });
    }

    APP.Storage = {
        STORAGE_KEY: STORAGE_KEY,
        load: load,
        save: save,
        clear: clear,
        exportJSON: exportJSON,
        importJSONFile: importJSONFile
    };
})();
