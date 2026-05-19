export function Footer() {
    return (
        <div className="text-center py-3 px-4">
            <p className="text-white/30 text-xs">
                ⚠️ Beta — still in testing. Deploy locally{" "}
                <a
                    href="https://saweria.co/rald"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/50 hover:text-white/80 underline transition-colors"
                >
                    Support here
                </a>{" "}
                or{" "}
                <a
                    href="https://trakteer.id/yudha_restu_alditya"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/50 hover:text-white/80 underline transition-colors"
                >
                    Buy me a cendol ☕
                </a>
            </p>
        </div>
    );
}