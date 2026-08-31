export function log(...args: unknown[]) {
    const timestamp = new Date().toISOString();
    console.log(
        `[${timestamp.replace("T", " ").replace("Z", " UTC")}]`,
        ...args,
    );
}
