"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.genRef = void 0;
const genRef = (prefix) => {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
    return `${prefix}-${ts}-${rand}`;
};
exports.genRef = genRef;
//# sourceMappingURL=gen.js.map