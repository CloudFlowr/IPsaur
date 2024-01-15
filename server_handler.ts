import config, { ConfigLink } from "./config.ts";
import { STATUS_CODE } from "std/http/status.ts";
import { stringify as yaml_stringify } from "std/yaml/stringify.ts";
import { getIpDetails, IpDetails } from "./ip_details.ts";
import { isRateLimited } from "./rate_limiter.ts";
import { getTextResponse } from "./text_response.ts";
import { log } from "./log.ts";
import { decodeBase64 } from "std/encoding/base64.ts";

export type NetTestData = {
  size: number;
  time: number;
  response_time: number;
  speed: number;
};

export type IpData = {
  ip: string;
  is_ip4: boolean;
  ua: string;
  ip_details: IpDetails;
  providers: ConfigLink[];
  servertime: string;
  browsertimeutc?: string;
  browsertimelocal?: string;
  nettest?: {
    round_trip_time?: number;
    download?: NetTestData | null;
    upload?: NetTestData | null;
  } | null;
  saved_error?: string;
  comment?: string;
};

export function isIPv4(ip: string) {
  return ip.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/) !== null;
}

export async function serverHandler(
  req: Request,
  conn_info: Deno.ServeHandlerInfo,
  static_files: Map<string, string>,
  ejs_templates: Map<string, ejs.AsyncTemplateFunction>,
): Promise<Response> {
  const url = new URL(req.url);
  const url_pathname = url.pathname.toLowerCase();
  const req_method = req.method.toLowerCase();
  const req_ip = conn_info.remoteAddr.hostname;
  const ua_header = req.headers.get("user-agent") ?? "";
  const content_type = req.headers.get("content-type") ?? "";
  const max_bw_test_length = 10000000;

  if (
    isRateLimited(
      req_ip + " " + req_method + " " + url_pathname.replaceAll("/", ""),
      config.server.rate_limit_threshold,
    )
  ) {
    return new Response("Too many requests from your IP", {
      status: STATUS_CODE.TooManyRequests,
    });
  }

  const static_filename = static_files.get(url_pathname.replace(/\/*/, ""));
  if (static_filename) return new Response(await Deno.readFile(static_filename));

  if (url_pathname === "/bandwidth") {
    if (req_method === "get") {
      const length = Number.parseInt("" + url.searchParams.get("length")) || 100000;
      if (length < 0) {
        return new Response("Request size must be greate then or equal to 0.", { status: STATUS_CODE.ContentTooLarge });
      }
      if (length > max_bw_test_length) {
        return new Response("Request size is too big", { status: STATUS_CODE.ContentTooLarge });
      }
      const sample = crypto.randomUUID();
      return new Response(
        (Date.now().toString() + " ").padEnd(length, sample),
        { headers: { "Content-Encoding": "identity" } },
      );
    }
    if (req_method === "post") {
      req.headers.get("content-length");
      const data_length = Number.parseInt(req.headers.get("content-length") || "") || 0;
      if (data_length > max_bw_test_length) {
        return new Response("Request size is too big", { status: STATUS_CODE.ContentTooLarge });
      }

      await req.arrayBuffer();
      return new Response(undefined, { status: STATUS_CODE.Accepted });
      // const ab = await req.arrayBuffer();
      // return new Response(ab.byteLength.toString(), {status:STATUS_CODE.Accepted});
    }
  }

  if (req_method === "get") {
    if (url_pathname === "/empty") {
      // Empty response used to measure round-trip time (aka latency).
      return new Response();
    }

    if (url_pathname === "/ip") {
      // return only IP address
      return new Response(conn_info.remoteAddr.hostname, {
        headers: { "content-type": "text/plain;charset=UTF-8" },
        status: STATUS_CODE.OK,
      });
    }

    if (url_pathname === "/s") {
      // return shared results
      const shared_str = url.search.substring(1);
      if (shared_str.length > 0) {
        try {
          const shared_json = new TextDecoder().decode(decodeBase64(shared_str));
          const shared_obj = JSON.parse(shared_json);

          const ip_data: IpData = {
            ip: shared_obj.ip,
            is_ip4: isIPv4(shared_obj.ip),
            ip_details: getIpDetails(shared_obj.ip),
            ua: shared_obj.ua,
            nettest: shared_obj.nt?.rtt
              ? {
                round_trip_time: shared_obj.nt.rtt,
                download: shared_obj.nt.dl
                  ? {
                    size: shared_obj.nt.dl.sz,
                    time: shared_obj.nt.dl.t,
                    response_time: shared_obj.nt.dl.rt,
                    speed: shared_obj.nt.dl.s,
                  }
                  : null,
                upload: shared_obj.nt.ul
                  ? {
                    size: shared_obj.nt.ul.sz,
                    time: shared_obj.nt.ul.t,
                    response_time: shared_obj.nt.ul.rt,
                    speed: shared_obj.nt.ul.s,
                  }
                  : null,
              }
              : null,
            providers: config.geoip.providers || [],
            servertime: shared_obj.stu || "",
            browsertimeutc: shared_obj.btu || "",
            browsertimelocal: shared_obj.btl || "",
            saved_error: shared_obj.e || "",
            comment: shared_obj.c || "",
          };

          const ip_data_render = {
            ...ip_data,
            links: config.links || [],
          };

          if (
            content_type === "text/plain" ||
            (ua_header.startsWith("curl/") && content_type === "")
          ) {
            const no_logo = url.searchParams.has("nologo") || content_type === "text/plain";
            return new Response(getTextResponse(ip_data_render, !no_logo, config.links), {
              headers: { "content-type": "text/plain;charset=UTF-8" },
              status: STATUS_CODE.OK,
            });
          }

          // Return json for corresponding content types
          if (content_type === "application/json" || content_type === "text/json") {
            return new Response(JSON.stringify(ip_data, undefined, 2), {
              headers: { "content-type": "application/json;charset=UTF-8" },
              status: STATUS_CODE.OK,
            });
          }

          // Return yaml for corresponding content types
          if (content_type === "application/yaml" || content_type === "text/yaml") {
            return new Response(yaml_stringify(ip_data), {
              headers: { "content-type": "application/yaml;charset=UTF-8" },
              status: STATUS_CODE.OK,
            });
          }

          // Return rendered page for browser
          const render_fn = ejs_templates.get("share");
          if (render_fn) {
            const rendered = await render_fn({
              ...ip_data_render,
              text_response: getTextResponse(ip_data, false),
            });

            return new Response(rendered, {
              headers: { "content-type": "text/html;charset=UTF-8" },
              status: STATUS_CODE.OK,
            });
          }
        } catch (err) {
          log("ERROR", err.stack || err.toString());
        }
        return new Response(undefined, {
          headers: { Location: "/" },
          status: STATUS_CODE.TemporaryRedirect,
        });
      }
    }

    const ip_data: IpData = {
      ip: conn_info.remoteAddr.hostname,
      is_ip4: isIPv4(conn_info.remoteAddr.hostname),
      ua: ua_header,
      ip_details: getIpDetails(conn_info.remoteAddr.hostname),
      providers: config.geoip.providers,
      servertime: new Date().toJSON(),
    };

    if (url_pathname === "/json") {
      return new Response(JSON.stringify(ip_data, undefined, 2), {
        headers: { "content-type": "application/json;charset=UTF-8" },
        status: STATUS_CODE.OK,
      });
    }

    if (url_pathname === "/yaml") {
      return new Response(yaml_stringify(ip_data), {
        headers: { "content-type": "application/yaml;charset=UTF-8" },
        status: STATUS_CODE.OK,
      });
    }

    if (url_pathname === "/plain") {
      return new Response(getTextResponse(ip_data, false), {
        headers: { "content-type": "text/plain;charset=UTF-8" },
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
        const no_logo = url.searchParams.has("nologo") || content_type === "text/plain";
        return new Response(getTextResponse(ip_data, !no_logo, config.links), {
          headers: { "content-type": "text/plain;charset=UTF-8" },
          status: STATUS_CODE.OK,
        });
      }

      // Return json for corresponding content types
      if (content_type === "application/json" || content_type === "text/json") {
        return new Response(JSON.stringify(ip_data, undefined, 2), {
          headers: { "content-type": "application/json;charset=UTF-8" },
          status: STATUS_CODE.OK,
        });
      }

      // Return yaml for corresponding content types
      if (content_type === "application/yaml" || content_type === "text/yaml") {
        return new Response(yaml_stringify(ip_data), {
          headers: { "content-type": "application/yaml;charset=UTF-8" },
          status: STATUS_CODE.OK,
        });
      }

      // Return rendered page for browser
      const render_fn = ejs_templates.get("index");
      if (render_fn) {
        return new Response(
          await render_fn({ ...ip_data, links: config.links, text_response: getTextResponse(ip_data, false) }),
          {
            headers: { "content-type": "text/html;charset=UTF-8" },
            status: STATUS_CODE.OK,
          },
        );
      }
    }
  }
  // Fallback - Route not found
  return new Response("Hello, I am IPsaur.", { status: STATUS_CODE.NotFound });
}
