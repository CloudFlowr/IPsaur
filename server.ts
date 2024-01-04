import config from "./config.ts";
import { STATUS_CODE } from "std/http/status.ts";
import { Buffer } from "node:buffer";

import { join as path_join } from "std/path/join.ts";

import maxmind, { Reader as mmReader, Response as mmResponse } from "maxmind";

import ejs from "ejs";

type LogLevel = "FATAL" | "ERROR" | "INFO" | "VERBOSE" | "DEBUG";
function log(level: LogLevel, ...message: (number | string | object)[]) {
  console.log(new Date().toJSON(), level, ...message);
}

const req_cache = new Map<string, number>();
const geo_dbs = new Map<string, mmReader<mmResponse>>();
const ejs_templates = new Map<string, ejs.AsyncTemplateFunction>();
const static_files = new Map<string, Uint8Array>();

function get_ip_details(ip: string) {
  maxmind.validate(ip);
  const result = {};
  geo_dbs.forEach(
    (v, k) => {
      Object.defineProperty(result, k, { value: v.get(ip), enumerable: true });
    },
  );
  return result;
}

function rate_limit(ip_url: string): boolean {
  const limit_ms = 1000 * 1; // 1 second
  const cur_ts = Date.now();
  const last_visit = req_cache.get(ip_url) || 0;
  req_cache.set(ip_url, cur_ts);
  if (cur_ts - last_visit < limit_ms) {
    return true;
  }
  return false;
}

async function serverHandler(
  req: Request,
  _info: Deno.ServeHandlerInfo,
): Promise<Response> {
  const url = new URL(req.url);
  const url_pathname = url.pathname.toLowerCase();
  const req_method = req.method.toLowerCase();
  const req_ip = _info.remoteAddr.hostname;
  const ua_header = req.headers.get("user-agent") ?? "";
  const content_type = req.headers.get("content-type") ?? "";
  const max_bw_test_length = 10000000;

  if (
    rate_limit(
      req_ip + " " + req_method + " " + url_pathname.replaceAll("/", ""),
    )
  ) {
    return new Response("Too many requests from your IP", {
      status: STATUS_CODE.TooManyRequests,
    });
  }

  const static_content = static_files.get(url_pathname.replace(/\/*/, ""));
  if (static_content) return new Response(static_content);

  if (url_pathname === "/bandwidth") {
    if (req_method === "get") {
      const length = Number.parseInt("" + url.searchParams.get("length")) ||
        100000;
      if (length > max_bw_test_length) {
        return new Response("Request size is too big", {
          status: STATUS_CODE.ContentTooLarge,
        });
      }
      const sample = crypto.randomUUID();
      return new Response(
        (Date.now().toString() + " ").padEnd(length, sample),
        { headers: { "Content-Encoding": "identity" } },
      );
    }
    if (req_method === "post") {
      req.headers.get("content-length");
      const data_length =
        Number.parseInt(req.headers.get("content-length") || "") || 0;
      if (data_length > max_bw_test_length) {
        return new Response("Request size is too big", {
          status: STATUS_CODE.ContentTooLarge,
        });
      }

      await req.arrayBuffer();
      return new Response(undefined, { status: STATUS_CODE.Accepted });
      // const ab = await req.arrayBuffer();
      // return new Response(ab.byteLength.toString(), {status:STATUS_CODE.Accepted});
    }
  }

  if (req_method === "get") {
    if (url_pathname === "/empty") {
      // Empty reponsse used to measure round-trip time (aka latency).
      return new Response();
    }

    if (url_pathname.replaceAll("/", "") === "") {
      // Default page
      // for curl - just return IP address
      if (ua_header.startsWith("curl/") && content_type === "") {
        return new Response(_info.remoteAddr.hostname, {
          headers: { "content-type": "text/plain;charset=UTF-8" },
          status: STATUS_CODE.OK,
        });
      }

      // const userAgent = new UserAgent(ua_header);
      const result = {
        ip: _info.remoteAddr.hostname,
        ua: ua_header,
        ip_details: get_ip_details(_info.remoteAddr.hostname),
        providers: config.geoip.providers,
      };

      // Return json for corresponding content types
      if (content_type === "application/json" || content_type === "text/json") {
        return new Response(
          JSON.stringify(result),
          { status: STATUS_CODE.OK },
        );
      }
      // Return rendered page for browser
      const render_fn = ejs_templates.get("index");
      if (render_fn) {
        return new Response(await render_fn(result), {
          headers: { "content-type": "text/html;charset=UTF-8" },
          status: STATUS_CODE.OK,
        });
      }
      // Fallback - return plaintext
      return new Response(Deno.inspect(result), {
        headers: { "content-type": "text/plain;charset=UTF-8" },
        status: STATUS_CODE.OK,
      });
    }
  }
  // Route not found
  return new Response("Hello, I am IP123", { status: STATUS_CODE.NotFound });
}

export default function bootstrap() {
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
    const db_path =
      Object.getOwnPropertyDescriptor(config.geoip.db, dbname)?.value || "";
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
          log("ERROR", `Maxmind DB file '${db_path}': ${error.toString()}`);
        }
      }
    }
  }

  // Compile EJS templates
  const template = Deno.readTextFileSync("./templates/index.ejs");
  ejs_templates.set("index", ejs.compile(template, { async: true }));
  log("VERBOSE", "Compiled index template");

  // Load static files
  for (const dirEntry of Deno.readDirSync("./static")) {
    if (dirEntry.isFile) {
      static_files.set(
        dirEntry.name,
        Deno.readFileSync(path_join("./static", dirEntry.name)),
      );
      log("VERBOSE", `Loaded static file '${dirEntry.name}'`);
    }
  }

  // Start HTTP server
  Deno.serve(
    { ...config.server },
    async (req, info) => {
      const startTimestamp = Date.now();
      const url = new URL(req.url);
      const reqId = crypto.randomUUID();
      log(
        "INFO",
        "-->",
        reqId,
        info.remoteAddr.hostname,
        req.method,
        url.pathname,
      );
      let result = new Response("Not Implemented", {
        status: STATUS_CODE.NotImplemented,
      });
      try {
        result = await serverHandler(req, info);
      } catch (err) {
        result = new Response((err as Error).toString(), {
          status: STATUS_CODE.InternalServerError,
        });
        log("ERROR", reqId, (err as Error).toString());
      } finally {
        const ms = Date.now() - startTimestamp;
        log(
          "INFO",
          "<--",
          reqId,
          info.remoteAddr.hostname,
          req.method,
          url.pathname,
          result?.status,
          `${ms}ms`,
        );
        result?.headers.set("X-Response-Time", ms.toString());
      }
      return result;
    },
  );
}
