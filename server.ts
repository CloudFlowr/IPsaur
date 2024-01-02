import config from "./config.ts";
import { STATUS_CODE } from "std/http/status.ts";
import { UserAgent } from "std/http/user_agent.ts";
import { Buffer } from "node:buffer";

import maxmind, { Reader as mmReader, Response as mmResponse } from "maxmind";

import ejs from "ejs";

type LogLevel = "FATAL" | "ERROR" | "INFO" | "VERBOSE" | "DEBUG";
function log(level: LogLevel, ...message: (number | string | object)[]) {
  console.log(new Date().toJSON(), level, ...message);
}

const geo_dbs: Map<string, mmReader<mmResponse>> = new Map();

const ejs_templates: Map<string, ejs.AsyncTemplateFunction> = new Map();

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

async function serverHandler(req: Request, _info: Deno.ServeHandlerInfo) {
  const url = new URL(req.url);
  if (req.method.toLowerCase() === "get") {
    if (url.pathname === "/empty") {
      // Empty reponsse used to measure round-trip time (aka latency).
      return new Response();
    }

    if (url.pathname === "/download") {
      return new Response(
        Date.now().toString().padEnd(20).repeat(10000),
        {
          headers: {
            "Content-Encoding": "identity",
          },
        },
      );
    }

    if (url.pathname.replaceAll("/", "") === "") {
      // Default page

      const ua_header = req.headers.get("user-agent") ?? "";
      const content_type = req.headers.get("content-type") ?? "";

      // for curl - just return IP address
      if (ua_header.startsWith("curl/") && content_type === "") {
        return new Response(_info.remoteAddr.hostname, {
          headers: { "content-type": "text/plain;charset=UTF-8" },
          status: STATUS_CODE.OK,
        });
      }

      const userAgent = new UserAgent(ua_header);
      const result = {
        ip: _info.remoteAddr.hostname,
        ua: userAgent,
        ip_details: get_ip_details(_info.remoteAddr.hostname),
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
        headers: { "content-type": "text/plain" },
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
        log('VERBOSE', `Opened Maxmind DB ${dbname} from '${db_path}'`)
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
  log('VERBOSE', 'Compiled index template')

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
