import * as tslog from "tslog";

interface ILogger {
  debug: (formatter: unknown, ...args: unknown[]) => void;
  error: (formatter: unknown, ...args: unknown[]) => void;
  info: (formatter: unknown, ...args: unknown[]) => void;
  trace: (formatter: unknown, ...args: unknown[]) => void;
  warn: (formatter: unknown, ...args: unknown[]) => void;
  child: (namespace: string) => ILogger;
  namespace: string;
}

export const CLILogger = class implements ILogger {
  logLevel: number;
  namespace: string;
  log: any;

  constructor(namespace: string, logLevel: number) {
    this.logLevel = logLevel;
    this.namespace = namespace;
    this.log = new tslog.Logger({ name: namespace, minLevel: logLevel });
  }

  debug = (formatter: unknown, ...args: unknown[]): void => {
    this.log.debug(args);
  };
  error = (formatter: unknown, ...args: unknown[]): void => {
    this.log.error(args);
  };
  info = (formatter: unknown, ...args: unknown[]): void => {
    this.log.info(args);
  };
  trace = (formatter: unknown, ...args: unknown[]): void => {
    this.log.trace(args);
  };
  warn = (formatter: unknown, ...args: unknown[]): void => {
    this.log.warn(args);
  };

  child = (namespace: string): ILogger => {
    return new CLILogger(namespace, this.logLevel);
  };
};

export const logger = new tslog.Logger({ name: "Migration CLI", minLevel: 2 });

export default CLILogger;
