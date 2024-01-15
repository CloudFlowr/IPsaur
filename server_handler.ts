import config, { ConfigLink } from "./config.ts";
import { STATUS_CODE } from "std/http/status.ts";
import { join as path_join } from "std/path/join.ts";
import { stringify as yaml_stringify } from "std/yaml/stringify.ts";
import { getIpDetails, IpDetails } from "./ip_details.ts";
import { isRateLimited } from "./rate_limiter.ts";
import { getTextResponse } from "./text_response.ts";
import { log } from "./log.ts";
import { decodeBase64 } from "std/encoding/base64.ts";

export type IpData = {
  ip: string;
  is_ip4: boolean;
  ua: string;
  ip_details: IpDetails;
  providers: ConfigLink[];
  servertime: string;
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

  // if (url_pathname === "/s") {
  //   if (req_method === "get") {
  //     const share_id = url.search.substring(1);
  //     if (share_id.length > 0) {
  //       try {
  //         const shared_json = await Deno.readTextFile(path_join(config.shared_dir, share_id + ".json"));
  //         const shared_obj = JSON.parse(shared_json);
  //         if (
  //           shared_obj.browsertimeutc &&
  //           (new Date(shared_obj.browsertimeutc).valueOf() > (Date.now() - 1000 * 60 * 60 * 24 * 30)) // last 30 days
  //         ) {
  //           // Return rendered page for browser
  //           const render_fn = ejs_templates.get("share");
  //           if (render_fn) {
  //             const ip_data = {
  //               ...shared_obj,
  //               is_ip4: isIPv4(shared_obj.ip),
  //               ip_details: getIpDetails(shared_obj.ip),
  //               providers: config.geoip.providers,
  //               saved_error: shared_obj.error || "",
  //               links: config.links,
  //             };
  //             const rendered = await render_fn({
  //               ...ip_data,
  //               text_response: getTextResponse(ip_data, false),
  //             });

  //             // const dl_speed = ((result) => {
  //             //   if (result) {
  //             //     let speed_h = "" + result.speed;
  //             //     if (result.speed > 1000) speed_h = `${result.speed / 1000}K`;
  //             //     if (result.speed > 1000000) speed_h = `${Math.round(result.speed / 1000) / 1000}M`;
  //             //     if (result.speed > 1000000000) speed_h = `${Math.round(result.speed / 1000000) / 1000}G`;
  //             //     return `${speed_h}bit/s (${result.blobsize / 1000}kB / ${result.time / 1000}s)`;
  //             //   } else {
  //             //     return "---";
  //             //   }
  //             // })(nettest.dl);

  //             return new Response(rendered, {
  //               headers: { "content-type": "text/html;charset=UTF-8" },
  //               status: STATUS_CODE.OK,
  //             });
  //           }

  //           return new Response(shared_json, {
  //             headers: { "content-type": "application/json;charset=UTF-8" },
  //             status: STATUS_CODE.OK,
  //           });
  //         }

  //         await Deno.remove(path_join(config.shared_dir, share_id + ".json"));
  //         await Deno.remove(path_join(config.shared_dir, share_id + ".deletekey"));
  //       } catch (err) {
  //         log("ERROR", err.stack || err.toString());
  //       }
  //       return new Response(undefined, {
  //         headers: { Location: "/" },
  //         status: STATUS_CODE.TemporaryRedirect,
  //       });
  //     }
  //   }
  //   if (req_method === "post") {
  //     const host_header = req.headers.get("host");
  //     // const origin_header = req.headers.get("origin");
  //     const ref_header = req.headers.get("referer");
  //     const server_base_url = (host_header && ref_header && ref_header.endsWith("://" + host_header + "/"))
  //       ? new URL(ref_header)
  //       : null;
  //     if (server_base_url) {
  //       try {
  //         const body_ab = await req.arrayBuffer();
  //         const share_id = crypto.randomUUID().replaceAll("-", "");
  //         const delete_key = crypto.randomUUID().replaceAll("-", "");

  //         await Deno.writeFile(
  //           path_join(config.shared_dir, share_id + ".json"),
  //           new Uint8Array(body_ab),
  //           { createNew: true },
  //         );
  //         await Deno.writeTextFile(
  //           path_join(config.shared_dir, share_id + ".deletekey"),
  //           delete_key,
  //           { createNew: true },
  //         );
  //         server_base_url.pathname = "/s";
  //         server_base_url.search = share_id;

  //         return new Response(JSON.stringify({ url: server_base_url.toJSON(), deletekey: delete_key }));
  //       } catch (err) {
  //         log("ERROR", err.stack || err.toString());
  //         //
  //       }
  //     }
  //     return new Response("Bad request", { status: STATUS_CODE.BadRequest });
  //   }
  //   if (req_method === "delete") {
  //     const share_id = url.search.substring(1);
  //     if (share_id.length > 0) {
  //       try {
  //         const req_delete_key = await req.text();
  //         const delete_key = await Deno.readTextFile(path_join(config.shared_dir, share_id + ".deletekey"));
  //         if (delete_key === req_delete_key) {
  //           await Deno.remove(path_join(config.shared_dir, share_id + ".deletekey"));
  //           await Deno.remove(path_join(config.shared_dir, share_id + ".json"));
  //         }
  //         return new Response(undefined, { status: STATUS_CODE.NoContent });
  //       } catch (err) {
  //         log("ERROR", err.stack || err.toString());
  //         return new Response("Bad request", { status: STATUS_CODE.BadRequest });
  //         // pass
  //       }
  //     }
  //   }
  // }

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

          // Return rendered page for browser
          const render_fn = ejs_templates.get("share");
          if (render_fn) {
            // deno-lint-ignore no-explicit-any
            const render_speed = (result: any) => {
              if (result) {
                let speed_h = "" + result.s;
                if (result.s > 1000) speed_h = `${result.s / 1000}K`;
                if (result.s > 1000000) speed_h = `${Math.round(result.s / 1000) / 1000}M`;
                if (result.s > 1000000000) speed_h = `${Math.round(result.s / 1000000) / 1000}G`;
                return `${speed_h}bit/s (${result.sz / 1000}kB / ${result.t / 1000}s)`;
              } else {
                return "---";
              }
            };

            const ip_data = {
              ip: shared_obj.ip,
              is_ip4: isIPv4(shared_obj.ip),
              ip_details: getIpDetails(shared_obj.ip),
              ua: shared_obj.ua,
              providers: config.geoip.providers || [],
              servertime: shared_obj.stu || "",
              saved_error: shared_obj.e || "",
              comment: shared_obj.c || "",
              links: config.links || [],
              rtt: shared_obj.nt?.rtt === undefined ? "---" : (shared_obj.nt.rtt + "ms"),
              dl_speed: shared_obj.nt?.dl === undefined ? "---" : render_speed(shared_obj.nt.dl),
              ul_speed: shared_obj.nt?.ul === undefined ? "---" : render_speed(shared_obj.nt.ul),
            };

            const rendered = await render_fn({
              ...ip_data,
              text_response: getTextResponse(ip_data, false),
            });

            return new Response(rendered, {
              headers: { "content-type": "text/html;charset=UTF-8" },
              status: STATUS_CODE.OK,
            });
          }

          return new Response(shared_json, {
            headers: { "content-type": "application/json;charset=UTF-8" },
            status: STATUS_CODE.OK,
          });
        } catch (err) {
          log("ERROR", err.stack || err.toString());
        }
        return new Response(undefined, {
          headers: { Location: "/" },
          status: STATUS_CODE.TemporaryRedirect,
        });
      }

      //       return new Response(conn_info.remoteAddr.hostname, {
      //         headers: { "content-type": "text/plain;charset=UTF-8" },
      //         status: STATUS_CODE.OK,
      //       });
      //     } catch (err) {
      //       log("ERROR", err.stack || err.toString());
      //     }
      //   }
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
      return new Response(JSON.stringify(ip_data), {
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
        return new Response(JSON.stringify(ip_data), {
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

      // const static_content = static_files.get("index.html");
      // if (static_content) return new Response(static_content);
    }
  }
  // Fallback - Route not found
  return new Response("Hello, I am IPsaur.", { status: STATUS_CODE.NotFound });
}
