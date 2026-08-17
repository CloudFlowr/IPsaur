IPsaur
============

IPsaur is a simple self-hosted IP and network bandwidth checker based on [Deno](https://deno.com).

## Demo

Try IPsaur at https://ipsaur.plechenko.deno.net/.

## Features

- Self-hosted on your premises (can be VM/Docker container/Lambda/etc.)
- Small memory footprint (~200MB)
- Uses MaxMind/DB-IP GeoLocation DBs
- Includes simple network bandwidth tester
- Test results can be copied to clipboard
- Test results can be shared with others as URL. Results are not persisted anywhere.
- Results can be received from server in json or yaml format

## Setup (if you want to host it yourself)

1. Install Deno as described [here](https://docs.deno.com/runtime/manual/getting_started/installation).

2. Clone the repository

```shell
git clone https://github.com/plechenko/ipsaur
cd ipsaur
```

3. Review `config.ts` file.

4. Run IPsaur using command:

```shell
deno run --allow-net --allow-read --allow-env ./main.ts
```

## Usage

### Browser

If you reach the IPsaur using web browser it will open a web page with IP address details and will perform the Network Bandwidth Test.

![Screenshot](media/browser_output.png)

You can copy results to clipboard or generate a share URL.

![Screenshot](media/browser_share.png)

Then open the Share URL on another computer:

![Screenshot](media/browser_shared_result.png)

### cURL

IPsaur supports output to cURL.

```shell
curl https://ipsaur.plechenko.deno.net/
```

![Screenshot](media/curl_output.png)

Shared URL can be also opened in cURL:

```shell
curl https://ipsaur.plechenko.deno.net/s?eyJpcCI6IjIwMDM6Yzk6N2Y0ZjozNGU6NmQyYjo1OWFmOmUxNzg6M2QxYSIsInVhIjoiTW96aWxsYS81LjAgKFgxMTsgTGludXggeDg2XzY0KSBBcHBsZVdlYktpdC81MzcuMzYgKEtIVE1MLCBsaWtlIEdlY2tvKSBDaHJvbWUvMTQxLjAuMC4wIFNhZmFyaS81MzcuMzYiLCJudCI6eyJydHQiOjY0LCJkbCI6eyJzeiI6NTAwMDAwLCJ0IjoyMTcsInJ0IjowLCJzIjoxODQzMzE4MH0sInVsIjp7InN6Ijo1MDAwMDAsInQiOjM1NiwicnQiOjI3NSwicyI6MTQ1NDU0NTV9fSwic3R1IjoiMjAyNi0wOC0xN1QxNzozMjoyNi42MTZaIiwiYnR1IjoiMjAyNi0wOC0xN1QxNzozMjoyNi45MjdaIiwiYnRsIjoiTW9uIEF1ZyAxNyAyMDI2IDE5OjMyOjI2IEdNVCswMjAwIChDZW50cmFsIEV1cm9wZWFuIFN1bW1lciBUaW1lKSIsImMiOiJDaGVjayBvdXQgaHR0cHM6Ly9naXRodWIuY29tL3BsZWNoZW5rby9pcHNhdXIiLCJlIjoiIn0=
```

![Screenshot](media/curl_shared_result.png)

### Output formatting

#### IP address only

To receive your IP addresss only just use `/ip` handler

```shell
curl https://ipsaur.plechenko.deno.net/ip
```

#### JSON

Add http header `Content-Type: text/json` or `Content-Type: application/json`

```shell
curl https://ipsaur.plechenko.deno.net/ -H 'Content-Type: text/json'
```

Or use handler `/json`

```shell
curl https://ipsaur.plechenko.deno.net/json
```

#### YAML

Add http header `Content-Type: text/yaml` or `Content-Type: application/yaml`

```shell
curl https://ipsaur.plechenko.deno.net/ -H 'Content-Type: text/yaml'
```

Or use handler `/yaml`

```shell
curl https://ipsaur.plechenko.deno.net/yaml
```

## Built with

IPsaur uses the following libraries:

* [node-maxmind](https://github.com/runk/node-maxmind)
* [EJS](https://github.com/mde/ejs)

## License

This project is licensed under the **MIT license**.

See [LICENSE](LICENSE) for more information.
