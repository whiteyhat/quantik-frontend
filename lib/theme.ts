export type AppTheme = "dark" | "light";

export const THEME_STORAGE_KEY = "quantik-theme";

export const themeBootstrapScript = `
  (function () {
    try {
      var theme = localStorage.getItem("${THEME_STORAGE_KEY}") === "light" ? "light" : "dark";
      document.documentElement.dataset.theme = theme;
    } catch (error) {
      document.documentElement.dataset.theme = "dark";
    }
  })();
`;
