function getConfiguredServerPort() {
  const value = parseInt(Deno.env.get("PORT") || "8000") || 8000;
  if (value < 1 || value > 65535) {
    throw new Deno.errors.NotSupported(`Port ${value} is not allowed`);
  }
  return value;
}

export default {
  server: {
    hostname: "0.0.0.0",
    port: getConfiguredServerPort(),
    // cert: , // Path to certificate file
    // key: , // Path to private key file
  },
  geoip: {
    providers: {
      dbip: true,
      maxmind: false,
    },
    db: {
      asn: "./mmdb/dbip-asn-lite-2024-01.mmdb",
      city: "./mmdb/dbip-city-lite-2024-01.mmdb",
      country: "./mmdb/dbip-country-lite-2024-01.mmdb",
      anonymousIP: "",
      connectionType: "",
      domain: "",
      isp: "",
    },
  },
};
