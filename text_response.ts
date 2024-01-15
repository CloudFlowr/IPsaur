import { IpData, NetTestData } from "./server_handler.ts";
import { ConfigLink } from "./config.ts";

const ANSI_COLOR_CODE = {
  // reset: 0,
  bold: 1,
  faint: 2,
  italic: 3,
  underline: 4,
  black: 30,
  red: 31,
  green: 32,
  yellow: 33,
  blue: 34,
  magenta: 35,
  cyan: 36,
  white: 37,
};

export function wrapWithColorCode(text: string, code: number[]): string {
  return `\x1b[${code.join(";")}m${text}\x1b[0m`;
}

export function printLogo(
  links: ConfigLink[],
) {
  const links_text = links.map((link) => "  " + link.name + ": " + wrapWithColorCode(link.url, [4])).join("\n");

  return `
                          00000000000000
                        0000  000000000000
                        000000000000000000
                        000000000000000000
                        00000000
                        00000000000000
                      00000000
                    0000000000
                  0000000000000000
  00            00000000000000  00
  0000        0000000000000000
  000000    0000  00      0000
  00000000000000  00  00  0000
    000000000000  00      00
      0000000000  00  000000
        000000000000000000
          00000000000000
            000000  0000
            0000     000
            00        00
            0000      0000

`.replaceAll("0", "▓") + links_text + "\n\n";
}

export function getTextResponse(
  data: IpData,
  with_logo: boolean,
  links: ConfigLink[] = [],
): string {
  let rsp_text = with_logo ? printLogo(links) : "";
  rsp_text += wrapWithColorCode(`IPv${data.is_ip4 ? 4 : 6} Address: `, [ANSI_COLOR_CODE.bold, ANSI_COLOR_CODE.green]) +
    wrapWithColorCode(data.ip, [ANSI_COLOR_CODE.bold, ANSI_COLOR_CODE.underline, ANSI_COLOR_CODE.green]) + "\n";
  if (data.ip_details.asn || data.ip_details.city) {
    rsp_text += wrapWithColorCode("\nIP Geolocation Details", [ANSI_COLOR_CODE.bold, ANSI_COLOR_CODE.blue]);
    if (data.providers.length > 0) {
      rsp_text += wrapWithColorCode(
        " Provided by " +
          data.providers.map<string>((provider) =>
            provider.name + " (" + wrapWithColorCode(provider.url, [ANSI_COLOR_CODE.underline]) + ")"
          ).join(", "),
        [ANSI_COLOR_CODE.italic, ANSI_COLOR_CODE.faint],
      );
      rsp_text += "\n";
    }
    if (data.ip_details.asn) {
      rsp_text += wrapWithColorCode("  Provider: ", [ANSI_COLOR_CODE.bold]) +
        data.ip_details.asn.autonomous_system_organization + " (AS" + data.ip_details.asn?.autonomous_system_number +
        ")\n";
    }
    if (data.ip_details.city) {
      rsp_text += wrapWithColorCode("  Country:  ", [ANSI_COLOR_CODE.bold]) + data.ip_details.city.continent?.code +
        " " +
        data.ip_details.city.country?.iso_code + " - " + data.ip_details.city.country?.names.en + "\n";
      rsp_text += wrapWithColorCode("  City:     ", [ANSI_COLOR_CODE.bold]) + data.ip_details.city.city?.names.en +
        "\n";
    }
    rsp_text += "\n";
  }
  rsp_text += wrapWithColorCode("User Agent: ", [ANSI_COLOR_CODE.bold, ANSI_COLOR_CODE.yellow]) + data.ua + "\n\n";

  if (data.servertime) {
    rsp_text += wrapWithColorCode("Server time (UTC): ", [ANSI_COLOR_CODE.bold, ANSI_COLOR_CODE.cyan]) +
      new Date(data.servertime).toISOString() + "\n";
  }
  if (data.browsertimeutc) {
    rsp_text += wrapWithColorCode("Browser time (UTC): ", [ANSI_COLOR_CODE.bold, ANSI_COLOR_CODE.cyan]) +
      new Date(data.browsertimeutc).toISOString() + "\n";
  }
  if (data.browsertimelocal) {
    rsp_text += wrapWithColorCode("Browser time (Local): ", [ANSI_COLOR_CODE.bold, ANSI_COLOR_CODE.cyan]) +
      data.browsertimelocal + "\n";
  }
  if (data.nettest) {
    rsp_text += wrapWithColorCode("\nNetwork Bandwidth Test", [ANSI_COLOR_CODE.bold, ANSI_COLOR_CODE.magenta]) + "\n";
    rsp_text += "Round-Trip Time: " + (data.nettest.round_trip_time ? (data.nettest.round_trip_time + "ms") : "---") +
      "\n";
    rsp_text += "Download Speed: " + render_speed(data.nettest.download) + "\n";
    rsp_text += "Upload Speed: " + render_speed(data.nettest.upload) + "\n";
  }
  if (data.saved_error && data.saved_error.length > 0) {
    rsp_text += "\n" + wrapWithColorCode("Saved Error: ", [ANSI_COLOR_CODE.bold, ANSI_COLOR_CODE.red]) + "\n" + data.saved_error + "\n";
  }
  if (data.comment) {
    rsp_text += "\n" + wrapWithColorCode("Comments: ", [ANSI_COLOR_CODE.bold]) + "\n" + data.comment + "\n";
  }

  return rsp_text;
}

export function render_speed(data: NetTestData | undefined | null) {
  if (data) {
    let speed_h = "" + data.speed;
    if (data.speed > 1000) speed_h = `${data.speed / 1000}K`;
    if (data.speed > 1000000) speed_h = `${Math.round(data.speed / 1000) / 1000}M`;
    if (data.speed > 1000000000) speed_h = `${Math.round(data.speed / 1000000) / 1000}G`;
    return `${speed_h}bit/s (${data.size / 1000}kB / ${data.time / 1000}s)`;
  } else {
    return "---";
  }
}
