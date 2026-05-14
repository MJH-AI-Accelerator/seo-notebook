"use client";

import { useEffect } from "react";
import App from "../App";

export default function Page() {
  useEffect(() => {
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith("seo-notebook-cache")) localStorage.removeItem(k);
      }
    } catch {}
  }, []);
  return <App />;
}
