import config from "./config.ts";
import { STATUS_CODE } from "std/http/status.ts";
import { join as path_join } from "std/path/join.ts";
import { basename as path_basename } from "std/path/basename.ts";
import { AsyncTemplateFunction as ejs_AsyncTemplateFunction, compile as ejs_compile } from "ejs";
import { serverHandler } from "./server_handler.ts";
import { log } from "./log.ts";
import { loadGeoLocationDBs } from "./ip_details.ts";

const ejs_templates = new Map<string, ejs_AsyncTemplateFunction>();
const static_files = new Map<string, string>();

export default function bootstrap() {
  loadGeoLocationDBs(config.geoip.db);
  cacheStaticFiles();
  compileEJSTemplates();
  startHttpServer();
}

function startHttpServer() {
  Deno.serve(
    { ...config.server },
    async (req, info) => {
      const startTimestamp = Date.now();
      const url = new URL(req.url);
      const reqId = crypto.randomUUID();
      log("INFO", "-->", reqId, info.remoteAddr.hostname, req.method, url.pathname);
      let result = new Response("Not Implemented", { status: STATUS_CODE.NotImplemented });
      try {
        result = await serverHandler(req, info, static_files, ejs_templates);
      } catch (err) {
        result = new Response((err as Error).toString(), { status: STATUS_CODE.InternalServerError });
        log("ERROR", reqId, (err as Error).stack || err.toString());
      } finally {
        const ms = Date.now() - startTimestamp;
        log("INFO", "<--", reqId, info.remoteAddr.hostname, req.method, url.pathname, result?.status, `${ms}ms`);
        result?.headers.set("X-Response-Time", ms.toString());
      }
      return result;
    },
  );
}

function compileEJSTemplates(templates_dir = "./templates") {
  // Compile EJS templates
  const ejs_ext = ".ejs";
  for (const dirEntry of Deno.readDirSync(templates_dir)) {
    if (dirEntry.isFile && dirEntry.name.endsWith(ejs_ext)) {
      const template = Deno.readTextFileSync(path_join(templates_dir, dirEntry.name));
      const template_name = path_basename(dirEntry.name, ejs_ext);
      ejs_templates.set(template_name, ejs_compile(template, { async: true }));
      log("VERBOSE", `Loaded EJS template '${template_name}'`);
    }
  }
}

function cacheStaticFiles(static_dir = "./static") {
  // Load static files
  for (const dirEntry of Deno.readDirSync(static_dir)) {
    if (dirEntry.isFile) {
      static_files.set(dirEntry.name, path_join("./static", dirEntry.name));
      log("VERBOSE", `Using static file '${dirEntry.name}'`);
    }
  }
}
