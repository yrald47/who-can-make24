export function Footer({ className }: { className?: string }) {
    return (
        <div className={`text-center py-3 px-4 ${className ?? ""}`}>
            <p className="text-game-muted/30 text-xs">
                made with ♥ by{" "}
                <a
                    href="https://github.com/yrald47"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-game-muted/50 hover:text-game-muted underline transition-colors"
                >
                    Rald
                </a>
            </p>
        </div>
    );
}