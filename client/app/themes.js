const html = document.documentElement;
const toggleBtn = document.querySelector("#themeBtn");
const savedTheme = localStorage.getItem("theme");
const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");


const applyTheme = (theme) => {
    html.setAttribute("data-theme", theme);
};


const saveAndApplyTheme = (theme) => {
    applyTheme(theme);
    localStorage.setItem("theme", theme);
};


mediaQuery.addEventListener("change", (e) => {
    if (!localStorage.getItem("theme")) {
        const newSystemTheme = e.matches ? "dark" : "light";
        applyTheme(newSystemTheme);
    }
});

if (savedTheme) {
    applyTheme(savedTheme);
} else {
    applyTheme(mediaQuery.matches ? "dark" : "light");
}

if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
        const currentTheme = html.getAttribute("data-theme");
        const newTheme = currentTheme === "dark" ? "light" : "dark";
        saveAndApplyTheme(newTheme);
    });
}