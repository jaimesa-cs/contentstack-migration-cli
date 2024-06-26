import { Args, Command, Flags } from "@oclif/core";
import fs from "fs";
import Stack from "../utils/stack.js";
import ContentstackAPI from "../contentstack-migration/contentstack.js";

interface DependencyData {
  uid: string;
  sortedDependencies: Stack<any>;
}

export default class Import extends Command {
  static override args = {
    location: Args.string({
      description: "Location (directory) to import from",
      required: true,
    }),
  };

  static override description =
    "Imports data from a directory into Contentstack";

  static override examples = ["<%= config.bin %> <%= command.id %>"];
  // ./bin/run.js import -k=blt89e5cca4078d31f2 -t=cs4be48d57db70bc9b7d78302f -l=2 -c -e -g -a  ./export/1719407608361
  // ./bin/run.js import -k=blt89e5cca4078d31f2 -t=cs4be48d57db70bc9b7d78302f -logLevel=3  ./export/1719407608361
  // ./bin/run.js import -k=blt89e5cca4078d31f2 -t=cs4be48d57db70bc9b7d78302f -l=2 -c -e -g -a --overwrite  ./export/1719407608361
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
    overwrite: Flags.boolean({
      char: "o",
      description: "Overwrite existing data",
      default: false,
    }),
    logLevel: Flags.string({
      char: "l",
      description: "Log level (0-5) (default: 3 - info)",
      default: "3", //Default to info
      options: ["0", "1", "2", "3", "4", "5"],
    }),

    contentTypes: Flags.boolean({
      char: "c",
      description: "Import content types",
    }),
    globalFields: Flags.boolean({
      char: "g",
      description: "Import global fields",
    }),
    entries: Flags.boolean({ char: "e", description: "Import entries" }),
    assets: Flags.boolean({ char: "a", description: "Import assets" }),
    taxonomies: Flags.boolean({ char: "t", description: "Import taxonomies" }),
  };

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Import);

    if (flags.contentTypes) {
      this.log(`Import Content Types: ${flags.contentTypes}`);
    }
    if (flags.globalFields) {
      this.log(`Import Global Fields: ${flags.globalFields}`);
    }
    if (flags.entries) {
      this.log(`Import Entries: ${flags.entries}`);
    }
    if (flags.assets) {
      this.log(`Import Assets: ${flags.assets}`);
    }
    if (flags.taxonomies) {
      this.log(`Import Taxonomies: ${flags.taxonomies}`);
    }

    if (
      !flags.contentTypes &&
      !flags.globalFields &&
      !flags.entries &&
      !flags.assets &&
      !flags.taxonomies
    ) {
      this.log(
        `Import Content Types, Global Fields, Entries, Assets, and Taxonomies`
      );
    }

    const loadEntries = flags.entries;
    const loadAssets = flags.assets || flags.entries;
    const loadContentTypes = flags.contentTypes;
    const loadGlobalFields = flags.globalFields || flags.contentTypes;
    const loadTaxonomies = flags.taxonomies;

    let assets = [];
    let entries = [];
    let contentTypes = [];
    let globalFields = [];
    let taxonomies: any = {};

    if (loadAssets) {
      const assetsStr = fs.readFileSync(`${args.location}/assets.json`, "utf8");
      assets = JSON.parse(assetsStr);
    }
    if (loadEntries) {
      const entriesStr = fs.readFileSync(
        `${args.location}/entries.json`,
        "utf8"
      );
      entries = JSON.parse(entriesStr);
    }
    if (loadContentTypes) {
      const contentTypesStr = fs.readFileSync(
        `${args.location}/content_types.json`,
        "utf8"
      );
      contentTypes = JSON.parse(contentTypesStr);
    }
    if (loadGlobalFields) {
      const globalFieldsStr = fs.readFileSync(
        `${args.location}/global_fields.json`,
        "utf8"
      );
      globalFields = JSON.parse(globalFieldsStr);
    }
    if (loadTaxonomies) {
      const taxonomiesStr = fs.readFileSync(
        `${args.location}/taxonomies.json`,
        "utf8"
      );
      const list = JSON.parse(taxonomiesStr);
      for (const taxonomy of list) {
        taxonomies[taxonomy.uid] = JSON.parse(
          fs.readFileSync(
            `${args.location}/taxonomies/${taxonomy.uid}.json`,
            "utf8"
          )
        );
      }
    }

    this.log(
      `Importing ${contentTypes.length} content types, ${globalFields.length} global fields, ${entries.length} entries, and ${assets.length} assets`
    );

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

    //1. Global Fields have no dependencies
    // We can import them right away
    for (const gf of globalFields) {
      await api.importGlobalField(gf, flags.overwrite);
    }

    //2. Taxonomies have no dependencies
    // Taxonomies can't be overwritten, the terms might need to be merged

    //3. Content Types have dependencies, so we need to import them first
    //TODO: Sort the content types by dependencies
    const ctStack: Stack<any> = new Stack();
    for (const ct of contentTypes) {
      //TODO: Check if the content type has dependencies
      ctStack.push(ct);
    }
  }
}
