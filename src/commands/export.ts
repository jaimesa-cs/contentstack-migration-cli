import { Args, Command, Flags } from "@oclif/core";
import ContentstackAPI from "../contentstack-migration/contentstack.js";
import fs, { writeFileSync } from "fs";
import { log } from "console";

export default class Export extends Command {
  static override args = {
    location: Args.string({
      description: "Location (directory) to export to",
      required: true,
    }),
  };

  static override description =
    "Exports Contentstack data for a given date range";

  static override examples = ["<%= config.bin %> <%= command.id %>"];
  //./bin/run.js export -k=blt89e5cca4078d31f2 -t=cs4be48d57db70bc9b7d78302f --startDate=2024-06-01 --endDate=2024-06-24 --logLevel=2  ./expor
  //./bin/run.js export -k=blt89e5cca4078d31f2 -t=cs4be48d57db70bc9b7d78302f --startDate=2022-06-01 --endDate=2024-06-24 -l=2  ./export

  static override flags = {
    key: Flags.string({
      char: "k",
      description: "Contentstack API Key",
      required: true,
    }),
    token: Flags.string({
      char: "t",
      description: "Contentstack Management Token",
      required: true,
    }),

    branch: Flags.string({
      char: "b",
      description: "Contentstack Branch",
    }),

    startDate: Flags.string({
      description: "Start date (YYYY-MM-DD)",
      required: true,
    }),
    endDate: Flags.string({
      description: "End date (YYYY-MM-DD)",
    }),

    logLevel: Flags.string({
      char: "l",
      description: "Log level (0-5) (default: 3 - info)",
      default: "3", //Default to info
      options: ["0", "1", "2", "3", "4", "5"],
    }),

    contentTypes: Flags.boolean({
      char: "c",
      description: "Export content types",
    }),
    globalFields: Flags.boolean({
      char: "g",
      description: "Export global fields",
    }),
    entries: Flags.boolean({ char: "e", description: "Export entries" }),
    assets: Flags.boolean({ char: "a", description: "Export assets" }),
    taxonomies: Flags.boolean({ char: "t", description: "Export taxonomies" }),
  };

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Export);

    const startDate = new Date(flags.startDate);
    let endDate = new Date();
    let exportGlobalFields = false;
    let exportContentTypes = false;
    let exportEntries = false;
    let exportAssets = false;
    let exportTaxonomies = false;

    if (flags.endDate) {
      endDate = new Date(flags.endDate);
    }
    if (flags.contentTypes) {
      this.log(`Export Content Types: ${flags.contentTypes}`);
      exportContentTypes = true;
    }
    if (flags.globalFields) {
      this.log(`Export Global Fields: ${flags.globalFields}`);
      exportGlobalFields = true;
    }
    if (flags.entries) {
      this.log(`Export Entries: ${flags.entries}`);
      exportEntries = true;
    }
    if (flags.assets) {
      this.log(`Export Assets: ${flags.assets}`);
      exportAssets = true;
    }
    if (flags.taxonomies) {
      this.log(`Export Taxonomies: ${flags.taxonomies}`);
      exportTaxonomies = true;
    }

    if (
      !flags.contentTypes &&
      !flags.globalFields &&
      !flags.entries &&
      !flags.assets &&
      !flags.taxonomies
    ) {
      this.log(
        `Export Content Types, Global Fields, Entries, Assets, and Taxonomies`
      );
    }

    this.log(
      "Date Range, Start Date: " +
        startDate.toUTCString() +
        ", End Date: " +
        endDate.toUTCString()
    );
    this.log(`Location: ${args.location}`);
    //Save to disk all the data
    const tempLocation = args.location + "/" + Date.now();
    this.log(`Temp Location: ${tempLocation}`);
    const assetsLocation = tempLocation + "/assets";
    const taxonomiesLocation = tempLocation + "/taxonomies";

    // Initialize the API
    const host = "https://api.contentstack.io";
    const logLevel = parseInt(flags.logLevel) || 3; //Default to info
    const api = new ContentstackAPI({
      host: host,
      key: flags.key,
      token: flags.token,
      branch: flags.branch || "main",
      logLevel: logLevel,
      strategySettings: {
        host: host,
        logLevel: logLevel,
        initialDelay: 250,
        maxRetries: 5,
      },
    });
    //1. Get all content types
    const cts = await api.getContentTypes(startDate, endDate);
    //2. Get all global fields
    const gfs = await api.getGlobalFields(startDate, endDate);
    //3. Get all entries
    const entries = [];
    for (const ct of cts) {
      const e = await api.getEntries(ct.uid, startDate, endDate);
      entries.push(...e);
    }
    //4. Get all assets
    const assets = await api.getAssets(startDate, endDate);
    //5. Get all taxonomies
    const taxonomies = await api.getTaxonomies();
    if (!fs.existsSync(tempLocation)) {
      fs.mkdirSync(tempLocation, { recursive: true });
    }
    if (!fs.existsSync(assetsLocation)) {
      fs.mkdirSync(assetsLocation, { recursive: true });
    }
    if (!fs.existsSync(taxonomiesLocation)) {
      fs.mkdirSync(taxonomiesLocation, { recursive: true });
    }

    writeFileSync(`${tempLocation}/content_types.json`, JSON.stringify(cts));
    writeFileSync(`${tempLocation}/global_fields.json`, JSON.stringify(gfs));
    writeFileSync(`${tempLocation}/entries.json`, JSON.stringify(entries));
    writeFileSync(
      `${tempLocation}/taxonomies.json`,
      JSON.stringify(taxonomies)
    );
    for (const taxonomy of taxonomies) {
      const fileName = taxonomy.uid + ".json";
      const taxonomyExport = await api.exportTaxonomy(taxonomy.uid);
      writeFileSync(
        `${taxonomiesLocation}/${fileName}`,
        JSON.stringify(taxonomyExport)
      );
    }
    writeFileSync(`${tempLocation}/assets.json`, JSON.stringify(assets));
    for (const asset of assets) {
      const fileName = asset.uid + "." + asset.filename;
      api.downloadAsset(asset.url, `${assetsLocation}/${fileName}`);
    }
  }
}
