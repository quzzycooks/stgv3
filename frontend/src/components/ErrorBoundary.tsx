import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Last-resort catch for uncaught render errors. Without this, a single throw
 * anywhere in the tree (e.g. calling a formatter on a field that turned out
 * to be null) unmounts the whole app to a blank white screen with no signal
 * to the user or to us in the logs.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Uncaught render error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="app-shell flex min-h-dvh flex-col items-center justify-center gap-4 bg-canvas px-7 safe-top safe-bottom text-center">
          <div className="grid h-16 w-16 place-items-center rounded-3xl bg-tint-primary text-primary">
            <AlertTriangle size={28} />
          </div>
          <div>
            <h1 className="font-display text-xl font-extrabold text-body">Something went wrong</h1>
            <p className="mt-2 text-[15px] text-muted">
              Stignit hit an unexpected error. Reloading usually fixes it.
            </p>
          </div>
          <Button size="lg" onClick={() => window.location.reload()}>
            Reload
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
