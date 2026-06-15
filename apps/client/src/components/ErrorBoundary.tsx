// apps/client/src/components/ErrorBoundary.tsx
import React, { type ReactNode } from "react";

interface Props {
    children: ReactNode;
}

interface State {
    error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("[ErrorBoundary]", error, errorInfo);
    }

    render() {
        if (this.state.error) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-game-bg">
                    <div className="text-center p-8 rounded-sm border border-game-coral/40 bg-game-coral/5 max-w-sm mx-4">
                        <p className="text-game-coral font-heading tracking-widest text-lg mb-2">
                            ⚠ Something went wrong
                        </p>
                        <p className="text-game-muted text-sm mb-6">
                            {this.state.error.message}
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="btn-moco btn-moco-ghost"
                        >
                            <span>↺ Reload Page</span>
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
