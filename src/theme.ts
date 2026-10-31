import { useEffect } from "react";

export function useApparence() {
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = "clair";
    root.style.colorScheme = "light";
    for (const variable of ["--accent", "--accent-contrast", "--accent-soft"])
      root.style.removeProperty(variable);
  }, []);
  return { mode: "clair" as const, couleur: "rouge" as const, sombre: false };
}
