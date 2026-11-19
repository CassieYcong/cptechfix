export const genRef = (prefix) => {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
    return `${prefix}-${ts}-${rand}`;
};
//# sourceMappingURL=gen.js.map