import config from "./config.ts";
import { STATUS_CODE } from "std/http/status.ts";
import { Buffer } from "node:buffer";

import { encodeHex } from "std/encoding/hex.ts";
import { encodeBase64 } from "std/encoding/base64.ts";
import { join as path_join } from "std/path/join.ts";

import maxmind, {
  AsnResponse,
  CityResponse,
  ConnectionTypeResponse,
  CountryResponse,
  IspResponse,
  Reader as mmReader,
  Response as mmResponse,
} from "maxmind";

// import ejs from "ejs";

const logo = `
                          ▓▓▓▓▓▓▓▓▓▓▓▓▓▓
                        ▓▓▓▓  ▓▓▓▓▓▓▓▓▓▓▓▓
                        ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
                        ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
                        ▓▓▓▓▓▓▓▓
                        ▓▓▓▓▓▓▓▓▓▓▓▓▓▓
                      ▓▓▓▓▓▓▓▓
                    ▓▓▓▓▓▓▓▓▓▓
                  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
  ▓▓            ▓▓▓▓▓▓▓▓▓▓▓▓▓▓  ▓▓
  ▓▓▓▓        ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
  ▓▓▓▓▓▓    ▓▓▓▓  ▓▓      ▓▓▓▓
  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓  ▓▓  ▓▓  ▓▓▓▓
    ▓▓▓▓▓▓▓▓▓▓▓▓  ▓▓      ▓▓
      ▓▓▓▓▓▓▓▓▓▓  ▓▓  ▓▓▓▓▓▓
        ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
          ▓▓▓▓▓▓▓▓▓▓▓▓▓▓
            ▓▓▓▓▓▓  ▓▓▓▓       https://github.com/cloudflowr/ipsaur
            ▓▓▓▓     ▓▓▓
            ▓▓        ▓▓       https://paypal.com/donate
            ▓▓▓▓      ▓▓▓▓

`;

type LogLevel = "FATAL" | "ERROR" | "INFO" | "VERBOSE" | "DEBUG";
function log(level: LogLevel, ...message: (number | string | object)[]) {
  console.log(new Date().toJSON(), level, ...message);
}

const req_cache = new Map<string, number>();
const geo_dbs = new Map<string, mmReader<mmResponse>>();
// const ejs_templates = new Map<string, ejs.AsyncTemplateFunction>();
const static_files = new Map<string, Uint8Array>();

type IpDetails = {
  asn?: AsnResponse | undefined;
  city?: CityResponse | undefined;
  country?: CountryResponse | undefined;
  isp?: IspResponse | undefined;
  connectionType?: ConnectionTypeResponse | undefined;
};

function get_ip_details(ip: string): IpDetails {
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

  if (url_pathname === "/s") {
    if (req_method === "get") {
      const share_id = url.search;
      if (share_id.length > 0) {
        try {
          const shared_json = await Deno.readTextFile(
            path_join(config.shared_dir, share_id + ".json"),
          );
          const shared_obj = JSON.parse(shared_json);
          if (
            shared_obj.browsertimeutc &&
            (new Date(shared_obj.browsertimeutc).valueOf() >
              (Date.now() - 1000 * 60 * 60 * 24 * 30)) // last 30 days
          ) {
            return new Response(shared_json, {
              headers: { "content-type": "application/json;charset=UTF-8" },
              status: STATUS_CODE.OK,
            });
          }

          await Deno.remove(path_join(config.shared_dir, share_id + ".json"));
          await Deno.remove(
            path_join(config.shared_dir, share_id + ".deletekey"),
          );
        } catch {
          // pass
        }
        return Response.redirect("/", STATUS_CODE.TemporaryRedirect);
      }
    }
    if (req_method === "post") {
      const host_header = req.headers.get("host");
      // const origin_header = req.headers.get("origin");
      const ref_header = req.headers.get("referer");
      const server_base_url = (host_header && ref_header &&
          ref_header.endsWith("://" + host_header + "/"))
        ? ref_header
        : "";
      if (server_base_url !== "") {
        try {
          const body_ab = await req.arrayBuffer();
          const share_id = encodeBase64(
            await crypto.subtle.digest("SHA-256", body_ab),
          );
          const delete_key = encodeBase64(
            await crypto.subtle.digest("SHA-1", body_ab),
          );

          await Deno.writeFile(
            path_join(config.shared_dir, share_id + ".json"),
            new Uint8Array(body_ab),
            { createNew: true },
          );
          await Deno.writeTextFile(
            path_join(config.shared_dir, share_id + ".deletekey"),
            delete_key,
            { createNew: true },
          );
          return new Response(
            JSON.stringify({
              url: `${server_base_url}s?${share_id}`,
              delete_key: delete_key,
            }),
          );
        } catch (err) {
          // if (err instanceof Deno.errors.AlreadyExists)
          //
        }
      }
      return new Response("Bad request.", { status: STATUS_CODE.BadRequest });
    }
    if (req_method === "delete") {
      const share_id = url.search;
      if (share_id.length > 0) {
        try {
          const req_delete_key = await req.text();
          const delete_key = await Deno.readTextFile(
            path_join(config.shared_dir, share_id + ".deletekey"),
          );
          if (delete_key === req_delete_key) {
            await Deno.remove(
              path_join(config.shared_dir, share_id + ".deletekey"),
            );
            await Deno.remove(
              path_join(config.shared_dir, share_id + ".json"),
            );
          }
          return new Response(undefined, {
            status: STATUS_CODE.NoContent,
          });
        } catch {
          return new Response("Bad request", {
            status: STATUS_CODE.BadRequest,
          });
          // pass
        }
        // return Response.redirect("/", STATUS_CODE.TemporaryRedirect);
      }
    }
  }

  if (req_method === "get") {
    if (url_pathname === "/empty") {
      // Empty response used to measure round-trip time (aka latency).
      return new Response();
    }

    if (url_pathname === "/ip") {
      return new Response(_info.remoteAddr.hostname, {
        headers: { "content-type": "text/plain;charset=UTF-8" },
        status: STATUS_CODE.OK,
      });
    }

    const result = {
      ip: _info.remoteAddr.hostname,
      ua: ua_header,
      ip_details: get_ip_details(_info.remoteAddr.hostname),
      providers: config.geoip.providers,
      servertime: new Date().toJSON(),
    };

    if (url_pathname === "/json") {
      return new Response(JSON.stringify(result), {
        headers: { "content-type": "application/json;charset=UTF-8" },
        status: STATUS_CODE.OK,
      });
    }

    if (url_pathname.replaceAll("/", "") === "") {
      // Default page

      // for curl or text/plain - return ansi-colored output
      if (
        content_type === "text/plain" ||
        (ua_header.startsWith("curl/") && content_type === "")
      ) {
        const no_logo = url.searchParams.has("nologo") ||
          content_type === "text/plain";
        let rsp_text =
          `\x1b[1;35mIP Address\x1b[0m  \x1b[1;4;32m${result.ip}\x1b[0m
\x1b[1;33mUser agent\x1b[0m  ${result.ua}`;
        if (result.ip_details.asn || result.ip_details.city) {
          rsp_text +=
            "\n\n\x1b[1;36mIP Geolocation Details\x1b[0m Provided by: ";
          if (result.providers.dbip) rsp_text += "DB-IP (https://db-ip.com) ";
          if (result.providers.maxmind) {
            rsp_text += "MaxMind (https://www.maxmind.com)";
          }

          if (result.ip_details.asn) {
            rsp_text +=
              `\n  Provider: ${result.ip_details.asn.autonomous_system_organization} (AS${result.ip_details.asn?.autonomous_system_number})`;
          }
          if (result.ip_details.city) {
            rsp_text +=
              `\n  Country:  ${result.ip_details.city.continent?.code} ${result.ip_details.city.country?.iso_code} - ${result.ip_details.city.country?.names.en}`;
            rsp_text +=
              `\n  City:     ${result.ip_details.city.city?.names.en}`;
          }
        }
        rsp_text += "\n\nServer time: " + new Date().toUTCString() + "\n";

        return new Response((no_logo ? "" : logo) + rsp_text, {
          headers: { "content-type": "text/plain;charset=UTF-8" },
          status: STATUS_CODE.OK,
        });
      }

      // Return json for corresponding content types
      if (content_type === "application/json" || content_type === "text/json") {
        return new Response(
          JSON.stringify(result),
          { status: STATUS_CODE.OK },
        );
      }

      // // Return rendered page for browser
      // const render_fn = ejs_templates.get("index");
      // if (render_fn) {
      //   return new Response(await render_fn(result), {
      //     headers: { "content-type": "text/html;charset=UTF-8" },
      //     status: STATUS_CODE.OK,
      //   });
      // }

      const static_content = static_files.get("index.html");
      if (static_content) return new Response(static_content);
    }
  }
  // Fallback - Route not found
  return new Response("Hello, I am IPsaur", { status: STATUS_CODE.NotFound });
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

  // // Compile EJS templates
  // const template = Deno.readTextFileSync("./templates/index.ejs");
  // ejs_templates.set("index", ejs.compile(template, { async: true }));
  // log("VERBOSE", "Compiled index template");

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
