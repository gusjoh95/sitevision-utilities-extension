import { getOptions, setOptions } from "../shared/api.js";

document.addEventListener("DOMContentLoaded", async () => {
    /** @type {HTMLInputElement | null} */
    const useSyntaxHighlighting = document.querySelector("#use-syntax-highlighting");
    /** @type {HTMLInputElement} */
    const reloadOnChange = document.querySelector("#reload-on-change");
    /** @type {HTMLPreElement} */
    const properties = document.querySelector("#properties");

    /** @type {HTMLButtonElement} */
    const saveBtn = document.querySelector("#save");

    try {
        const opts = await getOptions();
        useSyntaxHighlighting.checked = Boolean(opts.useSyntaxHighlighting);
        reloadOnChange.checked = Boolean(opts.reloadOnChange);
        saveBtn.removeAttribute('disabled');
    } catch {
        properties.textContent = "Failed to load options";
    }

    async function handleSave() {
        try {
            const toStore = {
                useSyntaxHighlighting: Boolean(useSyntaxHighlighting?.checked),
                reloadOnChange: Boolean(reloadOnChange?.checked)
            };
            saveBtn.setAttribute('disabled', '')
            await setOptions(toStore);

            properties.textContent = JSON.stringify(toStore, null, 2);

        } catch (error) {
            properties.textContent = error.message;
        }
        saveBtn.removeAttribute('disabled');

    };
    saveBtn.addEventListener("click", handleSave);
});