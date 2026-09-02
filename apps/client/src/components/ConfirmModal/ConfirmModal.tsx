interface ConfirmModalProps {
    message: string;
    subMessage?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    confirmVariant?: "danger" | "amber" | "ghost";
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmModal({
    message,
    subMessage,
    confirmLabel = "Yes, leave",
    cancelLabel = "Stay",
    confirmVariant = "danger",
    onConfirm,
    onCancel,
}: ConfirmModalProps) {
    const confirmClass =
        confirmVariant === "danger"
            ? "btn-moco btn-moco-danger flex-1"
            : confirmVariant === "amber"
                ? "btn-moco btn-moco-amber flex-1"
                : "btn-moco btn-moco-ghost flex-1";

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="card-moco card-moco-coral corner-accent-moco corner-accent-moco-coral w-full max-w-xs">
                <div className="top-bar-moco top-bar-moco-coral">
                    <span>Confirm</span>
                </div>
                <div className="p-5 flex flex-col gap-4">
                    <div>
                        <p className="text-game-text text-sm font-medium leading-relaxed">
                            {message}
                        </p>
                        {subMessage && (
                            <p className="text-game-muted text-xs mt-1.5 leading-relaxed">
                                {subMessage}
                            </p>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={onCancel}
                            className="btn-moco btn-moco-ghost flex-1"
                        >
                            <span>{cancelLabel}</span>
                        </button>
                        <button onClick={onConfirm} className={confirmClass}>
                            <span>{confirmLabel}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
