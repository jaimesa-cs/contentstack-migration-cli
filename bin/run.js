#!/usr/bin/env node

async function main() {
  const { execute } = await import("@oclif/core");
  const logger = await import("../dist/logger/index.js");
  await execute({
    //dir: __dirname,
    dir: import.meta.url,
    loadOptions: {
      root: import.meta.dirname,
      logger: new logger.CLILogger("Migration CLI", 5), //Default to trace
    },
  });
}

await main();
