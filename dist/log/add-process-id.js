"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const winston = require("winston");
const addProcessId = winston.format((info) => {
    info.pid = process.pid;
    return info;
});
exports.default = addProcessId;
// export = { addProcessId }
//# sourceMappingURL=add-process-id.js.map