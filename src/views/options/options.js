// ...existing code...
document.addEventListener("DOMContentLoaded", () => {
    const useSyntaxHighlighting = document.getElementById("useSyntaxHighlighting");
    const reloadOnChange = document.getElementById("reloadOnChange");
    const properties = document.getElementById("properties");
    const saveBtn = document.getElementById("save");

    // Load saved options and set the controls (provide sensible defaults)
    chrome.storage.sync.get(
        { useSyntaxHighlighting: true, reloadOnChange: true },
        (items) => {
            useSyntaxHighlighting.checked = Boolean(items.useSyntaxHighlighting);
            reloadOnChange.checked = Boolean(items.reloadOnChange);
        }
    );

    // Save options
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