import { ConfigLink } from "./config.ts";
import { IpDetails } from "./ip_details.ts";


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
