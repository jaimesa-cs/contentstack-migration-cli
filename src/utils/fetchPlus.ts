import * as tslog from "tslog";

export interface FetchRepeatStrategy {
  executeRequest: (
    url: RequestInfo | URL,
    config?: RequestInit
  ) => Promise<any>;
  execute: (partial: string, config?: RequestInit) => Promise<any>;
}

export interface StrategySettings {
  host?: string;
  logLevel?: number;
  initialDelay?: number;
  maxRetries?: number;
}

const fetchPlus = async (
  config: StrategySettings,
  infoOrUrl: RequestInfo | URL,
  options = {},

  currentRetryCount: number = 0
): Promise<any> => {
  const logLevel = config.logLevel || 3; //Default to info
  const delay = config.initialDelay || 250;
  const retries = config.maxRetries || 5;
  const log = new tslog.Logger({
    name: "Fetch Plus Strategy",
    minLevel: logLevel,
  });
  log.trace("MAX RETRIES", retries);
  log.trace("INITIAL_DELAY", delay);
  log.trace("URL", infoOrUrl);
  log.trace("Config", options);

  return fetch(infoOrUrl, options)
    .then(async (res) => {
      log.trace(infoOrUrl, "Status: ", res.status);

      if (res.ok) {
        return res.json();
      }
      if (res.status === 429) {
        log.warn(`Error fetching data on attempt #${currentRetryCount}...`);
        if (retries > 0) {
          currentRetryCount++;
          log.trace("Waiting...", currentRetryCount * delay, "ms");
          await new Promise((resolve) =>
            setTimeout(resolve, currentRetryCount * delay)
          );
          log.trace("Retrying...");
          return fetchPlus(
            {
              ...config,
              logLevel: logLevel,
              initialDelay: delay,
              maxRetries: retries - 1,
            },
            infoOrUrl,
            options,
            currentRetryCount
          );
        }
      }
      log.error("Unexpected Error executing request, not a 429", res);
      return res.json();
    })
    .catch((error) => {
      log.error("Fatal Error executing request");
      log.error(error);
    });
};

const FetchPlusStrategy = class implements FetchRepeatStrategy {
  config: StrategySettings;
  constructor(config: StrategySettings) {
    this.config = config;
  }
  async executeRequest(infoOrUrl: RequestInfo | URL, config?: RequestInit) {
    return fetchPlus(this.config, infoOrUrl, config, this.config.maxRetries);
  }
  async execute(partial: string, config?: RequestInit) {
    const url = new URL(partial, this.config.host).toString();
    return this.executeRequest(url, config);
  }
};

export default FetchPlusStrategy;
