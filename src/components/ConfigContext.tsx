import { createContext, useContext, type ReactNode } from "react";

export interface SEONotebookConfig {
  apiUrl: string;
  publication?: string;
}

const ConfigContext = createContext<SEONotebookConfig>({
  apiUrl: "https://ecaruso.vercel.app",
});

export function ConfigProvider({
  config,
  children,
}: {
  config: SEONotebookConfig;
  children: ReactNode;
}) {
  return (
    <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>
  );
}

export function useConfig(): SEONotebookConfig {
  return useContext(ConfigContext);
}
