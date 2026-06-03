type Op = "+" | "-" | "*" | "/";

function applyOp(a: number, b: number, op: Op): number | null {
    if (op === "/") {
        if (b === 0 || a % b !== 0) return null;
        return a / b;
    }
    if (op === "+") return a + b;
    if (op === "-") return a - b;
    return a * b;
}

function permutations<T>(arr: T[]): T[][] {
    if (arr.length <= 1) return [arr];
    return arr.flatMap((v, i) =>
        permutations([...arr.slice(0, i), ...arr.slice(i + 1)]).map((p) => [
            v,
            ...p,
        ]),
    );
}

export function canMake24(nums: number[]): boolean {
    const ops: Op[] = ["+", "-", "*", "/"];
    for (const perm of permutations(nums)) {
        const [a, b, c, d] = perm;
        for (const op1 of ops) {
            for (const op2 of ops) {
                for (const op3 of ops) {
                    // ((a op1 b) op2 c) op3 d
                    const r1 = applyOp(a, b, op1);
                    if (r1 !== null) {
                        const r2 = applyOp(r1, c, op2);
                        if (r2 !== null) {
                            const r3 = applyOp(r2, d, op3);
                            if (r3 === 24) return true;
                        }
                    }
                    // (a op1 (b op2 c)) op3 d
                    const r4 = applyOp(b, c, op2);
                    if (r4 !== null) {
                        const r5 = applyOp(a, r4, op1);
                        if (r5 !== null) {
                            const r6 = applyOp(r5, d, op3);
                            if (r6 === 24) return true;
                        }
                    }
                    // a op1 ((b op2 c) op3 d)
                    if (r4 !== null) {
                        const r7 = applyOp(r4, d, op3);
                        if (r7 !== null) {
                            const r8 = applyOp(a, r7, op1);
                            if (r8 === 24) return true;
                        }
                    }
                    // a op1 (b op2 (c op3 d))
                    const r9 = applyOp(c, d, op3);
                    if (r9 !== null) {
                        const r10 = applyOp(b, r9, op2);
                        if (r10 !== null) {
                            const r11 = applyOp(a, r10, op1);
                            if (r11 === 24) return true;
                        }
                    }
                    // (a op1 b) op2 (c op3 d)
                    if (r1 !== null && r9 !== null) {
                        const r12 = applyOp(r1, r9, op2);
                        if (r12 === 24) return true;
                    }
                }
            }
        }
    }
    return false;
}

const SUITS = ["♠", "♥", "♦", "♣"] as const;
const RANKS = [
    "A",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "J",
    "Q",
    "K",
];
const VALUES: Record<string, number> = {
    A: 1,
    "2": 2,
    "3": 3,
    "4": 4,
    "5": 5,
    "6": 6,
    "7": 7,
    "8": 8,
    "9": 9,
    "10": 10,
    J: 11,
    Q: 12,
    K: 13,
};

export interface TrainingCard {
    rank: string;
    suit: (typeof SUITS)[number];
    value: number;
}

export function generateSolvableHand(): TrainingCard[] {
    const maxAttempts = 500;
    for (let i = 0; i < maxAttempts; i++) {
        const hand: TrainingCard[] = Array.from({ length: 4 }, () => {
            const rank = RANKS[Math.floor(Math.random() * RANKS.length)]!;
            const suit = SUITS[Math.floor(Math.random() * SUITS.length)]!;
            return { rank, suit, value: VALUES[rank]! };
        });
        if (canMake24(hand.map((c) => c.value))) return hand;
    }
    // Fallback: 1,2,3,4 → 1×2×3×4 = 24
    return [
        { rank: "1", suit: "♠", value: 1 },
        { rank: "2", suit: "♥", value: 2 },
        { rank: "3", suit: "♦", value: 3 },
        { rank: "4", suit: "♣", value: 4 },
    ];
}
