import winston = require("winston");

const addProcessId = winston.format((info) => {
    info.pid = process.pid;
    return info;
  });

export default addProcessId
// export = { addProcessId }