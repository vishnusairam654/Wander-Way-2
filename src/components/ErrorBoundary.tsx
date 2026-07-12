import React from "react";

interface ErrorBoundaryState {
    hasError: boolean;
}

interface ErrorBoundaryProps {
    children: React.ReactNode;
}

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(): ErrorBoundaryState {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("UI render error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen w-full bg-[#FAFAF7] flex flex-col items-center justify-center gap-3 p-6 text-center">
                    <h1 className="font-display text-xl font-bold text-slate-900">Something went wrong</h1>
                    <p className="font-sans text-sm text-slate-500">Please refresh the page and try again.</p>
                </div>
            );
        }

        return this.props.children;
    }
}
