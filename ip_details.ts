import {
  AsnResponse,
  CityResponse,
  ConnectionTypeResponse,
  CountryResponse,
  IspResponse,
  Reader as mmReader,
  Response as mmResponse,
  validate as mmValidate,
} from "maxmind";
import { log } from "./log.ts";
import { Buffer } from "node:buffer";

const geo_dbs = new Map<string, mmReader<mmResponse>>();

export type IpDetails = {
  asn?: AsnResponse | undefined;
  city?: CityResponse | undefined;
  country?: CountryResponse | undefined;
  isp?: IspResponse | undefined;
  connectionType?: ConnectionTypeResponse | undefined;
};

export function getIpDetails(
  ip: string,
): IpDetails {
  const result = {};
  if (mmValidate(ip)) {
    geo_dbs.forEach(
      (v, k) => {
        Object.defineProperty(result, k, { value: v.get(ip), enumerable: true });
      },
    );
  }
  return result;
}

export function loadGeoLocationDBs(dbs: Record<string, string>) {
  // Open Maxmind GeoIP2 databases

  for (
    const dbname of [
      "anonymousIP",
      "asn",
      "city",
      "country",
      "connectionType",
      "domain",
      "isp",
    ]
  ) {
    const db_path = Object.getOwnPropertyDescriptor(dbs, dbname)?.value || "";
    if (db_path !== "") {
      try {
        const fs = Deno.statSync(db_path);
        if (!fs.isFile) {
          throw new Deno.errors.NotFound();
        }
        const buf_data = Deno.readFileSync(db_path);
        const buffer = Buffer.from(buf_data);
        geo_dbs.set(dbname, new mmReader<mmResponse>(buffer));
        log("VERBOSE", `Opened Maxmind DB ${dbname} from '${db_path}'`);
      } catch (error) {
        if (error instanceof Deno.errors.NotFound) {
          log("ERROR", `Maxmind DB file '${db_path}' is not found`);
        } else {
          log("ERROR", `Maxmind DB file '${db_path}': ${error.stack || error.toString()}`);
        }
      }
    }
  }
}
