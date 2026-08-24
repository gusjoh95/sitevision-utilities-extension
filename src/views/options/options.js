import { getOptions, highlightJson, setOptions, assignJsonTheme, getErrorMessage } from "../shared/api.js";

document.addEventListener("DOMContentLoaded", async () => {
    /** @type {HTMLInputElement | null} */
    const useSyntaxHighlighting = document.querySelector("#use-syntax-highlighting");
    /** @type {HTMLInputElement} */
    const reloadOnChange = document.querySelector("#reload-on-change");
    /** @type {HTMLPreElement} */
    const properties = document.querySelector("#properties");

    /** @type {HTMLSelectElement} */
    const dropdown = document.querySelector("#theme-dropdown");

    /** @type {HTMLButtonElement} */
    const saveBtn = document.querySelector("#save");

    assignJsonTheme(document.querySelector("#json-theme"));

    try {
        const opts = await getOptions();
        useSyntaxHighlighting.checked = Boolean(opts.useSyntaxHighlighting);
        reloadOnChange.checked = Boolean(opts.reloadOnChange);
        const jsonTheme = opts?.jsonTheme || "";
        try {
            const jsonUrl = chrome.runtime.getURL("views/shared/json-themes/themes.json");
            const response = await fetch(jsonUrl);
            const themes = await response.json();

            themes.forEach(theme => {
                const option = document.createElement("option");
                option.value = theme.file;
                option.selected = (theme.file === jsonTheme);
                option.textContent = theme.name;
                dropdown.appendChild(option);
            });
        } catch (error) {
            console.error("Failed to load themes", error);
        }
        dropdown.addEventListener("change", () => {
            const selectedTheme = dropdown.value || 'default.css';
            /** @type {HTMLLinkElement} */
            const themeLink = document.querySelector("#json-theme");
            themeLink.href = chrome.runtime.getURL(`views/shared/json-themes/${selectedTheme}`);
        });


        saveBtn.removeAttribute('disabled');
    } catch {
        properties.textContent = "Failed to load options";
    }

    async function handleSave() {
        try {
            const toStore = {
                useSyntaxHighlighting: Boolean(useSyntaxHighlighting?.checked),
                reloadOnChange: Boolean(reloadOnChange?.checked),
                jsonTheme: String(dropdown.value),
            };
            saveBtn.setAttribute('disabled', '')
            await setOptions(toStore);

            properties.textContent = JSON.stringify(toStore, null, 2);

        } catch (error) {
            const msg = getErrorMessage(error);
            properties.textContent = msg;
        }
        saveBtn.removeAttribute('disabled');

    };
    saveBtn.addEventListener("click", handleSave);

    /** @type {HTMLDetailsElement} */
    const expandable = document.querySelector("#expandable");
    expandable.addEventListener("toggle", async () => {
        if (expandable.open) {
            const dummyJson = await fetch(chrome.runtime.getURL("views/options/dummydata/dummy.json"));
            expandable.querySelector(".json-holder pre").replaceChildren(highlightJson(await dummyJson.json()));
        }
    });


});