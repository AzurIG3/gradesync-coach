import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

import { reportLovableError } from "@/lib/lovable-error-reporting";

type Props = { children: ReactNode; label?: string };
type State = { error: Error | null };

/**
 * React error boundary wrapped around each major page/route so a crash in one
 * component shows a friendly "Something went wrong — Reload" card instead of a
 * blank white screen.
 */
export class PageErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[boundary] ${this.props.label ?? "page"} crashed`, error, info.componentStack);
    reportLovableError(error, { boundary: this.props.label ?? "page_error_boundary" });
  }

  private reset = () => this.setState({ error: null });

  private reload = () => {
    if (typeof window !== "undefined") window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-5 w-5" aria-hidden />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-foreground">Something went wrong</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This part of the app hit an unexpected error. Your saved notes and progress are safe.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button
              onClick={this.reload}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
              Reload
            </button>
            <button
              onClick={this.reset}
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }
}
