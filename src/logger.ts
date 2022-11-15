import pino from 'pino';

let logger = pino({
    level: 'debug'
});

export { logger };