
import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-destructive/5 p-4">
                    <div className="max-w-2xl w-full bg-white rounded-lg shadow-xl border border-destructive/20 p-8 space-y-4">
                        <div className="flex items-center gap-3 text-destructive">
                            <AlertTriangle className="h-10 w-10" />
                            <h1 className="text-2xl font-bold">Something went wrong</h1>
                        </div>

                        <p className="text-gray-600">
                            An error occurred while rendering the application. Please examine the details below:
                        </p>

                        {this.state.error && (
                            <div className="bg-slate-900 text-slate-50 p-4 rounded-md overflow-auto shadow-inner">
                                <p className="font-mono font-bold text-red-300 mb-2">
                                    {this.state.error.toString()}
                                </p>
                                {this.state.errorInfo && (
                                    <pre className="text-xs text-slate-400 font-mono whitespace-pre-wrap">
                                        {this.state.errorInfo.componentStack}
                                    </pre>
                                )}
                            </div>
                        )}

                        <button
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                        >
                            Reload Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
