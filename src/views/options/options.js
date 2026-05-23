document.addEventListener("DOMContentLoaded", () => {
    const useSyntaxHighlighting = document.getElementById("use-syntax-highlighting");
    const reloadOnChange = document.getElementById("reload-on-change");
    const properties = document.getElementById("properties");
    const saveBtn = document.getElementById("save");

    chrome.storage.sync.get(
        { useSyntaxHighlighting: true, reloadOnChange: true },
        (items) => {
            useSyntaxHighlighting.checked = Boolean(items.useSyntaxHighlighting);
            reloadOnChange.checked = Boolean(items.reloadOnChange);
        }
    );

    saveBtn.addEventListener("click", () => {
        const toStore = {
            useSyntaxHighlighting: Boolean(useSyntaxHighlighting?.checked),
            reloadOnChange: Boolean(reloadOnChange?.checked)
        };

        chrome.storage.sync.set(toStore, () => {
            properties.textContent = JSON.stringify(toStore, null, 2);
        });
    });
});