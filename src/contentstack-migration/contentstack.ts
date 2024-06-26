import * as tslog from "tslog";

import FetchPlusStrategy, {
  FetchRepeatStrategy,
  StrategySettings,
} from "../utils/fetchPlus.js";

import fs from "fs";
import https from "https";

export interface ApiSettings {
  host: string;
  key: string;
  token: string;
  branch: string;
  logLevel: number;
  strategySettings: StrategySettings;
}
const pageSize = 100;

const KEYS_TO_REMOVE_FROM_ENTRY = [
  "content_type_uid",
  "created_at",
  "updated_at",
  "created_by",
  "updated_by",
  "ACL",
  "stackHeaders",
  "urlPath",
  "_version",
  "_in_progress",
  "update",
  "delete",
  "fetch",
  "publish",
  "unpublish",
  "publishRequest",
  "setWorkflowStage",
  "import",
];

const getDateRangeFilter = (startDate?: Date, endDate?: Date) => (obj: any) => {
  if (obj.updated_at) {
    if (startDate && endDate) {
      return (
        new Date(obj.updated_at) > new Date(startDate) &&
        new Date(obj.updated_at) < new Date(endDate)
      );
    }
  }
  return true;
};

interface IContentstackAPI {
  config: ApiSettings;
  log: any;
  fetch: FetchRepeatStrategy;
  getContentTypes: (startDate?: Date, endDate?: Date) => Promise<any>;
  getGlobalFields: (startDate?: Date, endDate?: Date) => Promise<any>;
  getGlobalField: (uid: string) => Promise<any>;
  getEntries: (
    contentTypeUid: string,
    startDate?: Date,
    endDate?: Date
  ) => Promise<any>;
  getAssets: (startDate?: Date, endDate?: Date) => Promise<any>;
  getTaxonomies: () => Promise<any>;
  exportTaxonomy: (uid: string) => Promise<any>;
  importGlobalField: (gf: any, overwrite: boolean) => Promise<any>;
  importContentType: (ct: any, overwrite: boolean) => Promise<any>;
  paginatedFetch: (
    url: string,
    property: string,
    filter: (any: any) => boolean
  ) => Promise<any>;
  downloadAsset: (url: string, fileName: string) => void;
}

const ContentstackAPI = class implements IContentstackAPI {
  host: string;
  key: string;
  token: string;
  branch: string;
  config: ApiSettings;
  log: any;
  defaultHeaders: any;
  fetch: FetchRepeatStrategy;
  constructor(config: ApiSettings) {
    this.config = config;
    this.host = config.host;
    this.key = config.key;
    this.token = config.token;
    this.branch = config.branch;
    this.log = new tslog.Logger({
      name: "Contentstack API",
      minLevel: config.logLevel,
    });
    this.defaultHeaders = {
      api_key: this.key,
      authorization: this.token,
      branch: this.branch,
      "Content-Type": "application/json",
    };
    this.fetch = new FetchPlusStrategy(config.strategySettings);
  }
  async paginatedFetch(
    partialUrl: string,
    property: string,
    filter: (any: any) => boolean
  ) {
    let data: any[] = [];
    let url = `${partialUrl}?include_count=true&limit=${pageSize}`;
    let response = await this.fetch.execute(url, {
      headers: this.defaultHeaders,
    });
    this.log.trace(`Pagination #1 Response: `);
    this.log.trace(response);

    if (
      response &&
      response.count &&
      response[property] &&
      response[property].length > 0
    ) {
      const pages = Math.ceil(response.count / pageSize);
      data.push(...response[property]);
      for (let i = 1; i < pages; i++) {
        url = `${partialUrl}?include_count=true&limit=${pageSize}&skip=${
          i * pageSize
        }`;
        response = await this.fetch.execute(partialUrl, {
          headers: {
            api_key: this.key,
            authorization: this.token,
            branch: this.branch,
          },
        });
        this.log.trace(`Pagination #${i + 1} Response: `);
        this.log.trace(response);
        if (
          response?.[property] &&
          response.count &&
          response?.[property].length > 0
        ) {
          data.push(...response[property]);
        }
      }
    }
    this.log.trace("Final Data: ");
    this.log.trace(data);
    const filteredData = data.filter(filter);
    this.log.trace("Filtered Data: ");
    this.log.trace(filteredData);
    return filteredData;
  }
  async getContentTypes(startDate?: Date, endDate?: Date) {
    const property = "content_types";
    //Not working:
    //&query={"$and": [{ "updated_at": { "$lt": ${endDate.toISOString()} } },{ "updated_at": { "$gt": ${startDate.toISOString()} } } ]
    let types: any[] = await this.paginatedFetch(
      "/v3/content_types",
      property,
      getDateRangeFilter(startDate, endDate)
    );
    this.log.debug(property + " Found: " + types.length);
    this.log.trace("Response: ");
    this.log.trace(types);
    return types;
  }
  async getGlobalFields(startDate?: Date, endDate?: Date) {
    const property = "global_fields";
    let gfs: any[] = await this.paginatedFetch(
      "/v3/global_fields",
      property,
      getDateRangeFilter(startDate, endDate)
    );
    this.log.debug(property + " Found: " + gfs.length);
    this.log.trace("Response: ");
    this.log.trace(gfs);
    return gfs;
  }
  async getGlobalField(globalFieldUid: string) {
    const property = "global_field";
    let gf: any = await this.fetch.execute(
      `/v3/global_fields/${globalFieldUid}`,
      {
        headers: this.defaultHeaders,
      }
    );
    this.log.debug(`${property} Found: ${gf !== undefined}`);
    this.log.trace("Response: ");
    this.log.trace(gf);
    return gf;
  }
  async getEntries(contentTypeUid: string, startDate?: Date, endDate?: Date) {
    const property = "entries";
    let entries: any[] = await this.paginatedFetch(
      `/v3/content_types/${contentTypeUid}/entries`,
      property,
      getDateRangeFilter(startDate, endDate)
    );
    this.log.debug(
      property + " for " + contentTypeUid + " Found: " + entries.length
    );
    this.log.trace("Response: ");
    this.log.trace(entries);
    return entries;
  }
  async getAssets(startDate?: Date, endDate?: Date) {
    const property = "assets";
    let assets: any[] = await this.paginatedFetch(
      `/v3/assets`,
      property,
      getDateRangeFilter(startDate, endDate)
    );
    this.log.debug(property + " Found: " + assets.length);
    this.log.trace("Response: ");
    this.log.trace(assets);
    return assets;
  }
  async getTaxonomies() {
    const property = "taxonomies";
    let taxonomies: any[] = await this.paginatedFetch(
      `/v3/taxonomies`,
      property,
      getDateRangeFilter()
    );
    return taxonomies;
  }
  async exportTaxonomy(uid: string) {
    const taxonomy = await this.fetch.execute(`/v3/taxonomies/${uid}/export`, {
      headers: this.defaultHeaders,
    });
    this.log.trace(`Exporting taxonomy: ${uid}`);
    this.log.trace("Response: ");
    this.log.trace(taxonomy);
    return taxonomy;
  }
  async importGlobalField(gf: any, overwrite: boolean) {
    let method = "POST";
    let partialUrl = `/v3/global_fields`;

    const gfExists = await this.getGlobalField(gf.uid);
    if (gfExists) {
      this.log.debug("Global field already exists: " + gf.uid);
      method = "PUT";
      partialUrl = `${partialUrl}/${gf.uid}`;
    }
    if (overwrite || !gfExists) {
      this.log.debug(
        `${overwrite ? "Overwriting" : "Creating"} global field: ${gf.uid}`
      );

      const response = await this.fetch.execute(
        `${this.config.host}${partialUrl}`,
        {
          method: method,
          headers: this.defaultHeaders,
          body: JSON.stringify({
            global_field: gf,
          }),
        }
      );
      this.log.trace("Response: ");
      this.log.trace(response);
    } else {
      this.log.debug("Skipping global field: " + gf.uid);
    }
  }
  async importContentType(ct: any, overwrite: boolean) {
    let method = "POST";
    let partialUrl = `/v3/content_types`;

    const ctExists = await this.getGlobalField(ct.uid);
    if (ctExists) {
      this.log.debug("Content type already exists: " + ct.uid);
      method = "PUT";
      partialUrl = `${partialUrl}/${ct.uid}`;
    }
    if (overwrite || !ctExists) {
      this.log.debug(
        `${overwrite ? "Overwriting" : "Creating"} content type: ${ct.uid}`
      );

      const response = await this.fetch.execute(
        `${this.config.host}${partialUrl}`,
        {
          method: method,
          headers: this.defaultHeaders,
          body: JSON.stringify({
            content_type: ct,
          }),
        }
      );
      this.log.trace("Response: ");
      this.log.trace(response);
    } else {
      this.log.debug("Skipping global field: " + ct.uid);
    }
  }

  downloadAsset(url: string, fileName: string) {
    const file = fs.createWriteStream(fileName);
    const log = this.log;
    https.get(url, function (response) {
      response.pipe(file);
      // after download completed close filestream
      file.on("finish", () => {
        file.close();
        log.debug(`Download Completed: ${url} > ${fileName}`);
      });
      file.on("error", (err) => {
        log.error("Error: " + err);
        fs.unlink(fileName, () => {
          log.debug(`Deleted file: ${fileName}`);
        });
      });
    });
  }
};

export default ContentstackAPI;
