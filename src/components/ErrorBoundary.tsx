import { Component, type ReactNode, type ErrorInfo } from "react";
import { MJH_GOLD } from "./styles";

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: 24, textAlign: "center", display: "flex", flexDirection: "column",
          alignItems: "center", gap: 12, color: "#6b7280",
        }}>
          <svg width="32" height="32" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="3" width="4" height="10" rx="1" fill={MJH_GOLD} opacity="0.3" />
            <rect x="6" y="1" width="4" height="14" rx="1" fill={MJH_GOLD} opacity="0.3" />
            <rect x="11" y="5" width="4" height="8" rx="1" fill={MJH_GOLD} opacity="0.3" />
          </svg>
          <div style={{ fontSize: 14, fontWeight: 600 }}>
            {this.props.fallbackMessage || "Something went wrong"}
          </div>
          <div style={{ fontSize: 12, color: "#9ca3af" }}>
            {this.state.error?.message || "An unexpected error occurred"}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: "6px 16px", fontSize: 12, fontWeight: 600, borderRadius: 8,
              background: MJH_GOLD, color: "#fff", border: "none", cursor: "pointer",
              marginTop: 4,
            }}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
