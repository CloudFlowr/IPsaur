export interface ConfigLink {
  name: string;
  icon?: string;
  url: string;
}

function getConfiguredServerPort() {
  const value = parseInt(Deno.env.get("PORT") || "") || 8080;
  if (value < 1 || value > 65535) throw new Deno.errors.NotSupported(`Port ${value} is not allowed`);
  return value;
}

function getConfiguredRateLimitThreshild() {
  // Limit to 1 request per N msec
  // Default = 1000
  // 0 - rate limiting disabled
  const value = parseInt(Deno.env.get("RATE_LIMIT_THRESHOLD") || "") || 1000;
  if (value < 0) throw new Deno.errors.NotSupported("Rate limit threshold should be more then or equal to 0.");
  return value;
}

export default {
  server: {
    hostname: "0.0.0.0",
    port: getConfiguredServerPort(),
    // cert: , // Path to certificate file
    // key: , // Path to private key file
    rate_limit_threshold: getConfiguredRateLimitThreshild(),
  },
  geoip: {
    providers: [
      { name: "DB-IP", url: "https://db-ip.com", icon: "" },
      // { name: "MaxMind", url: "https://www.maxmind.com", icon: "" },
    ],
    db: {
      asn: "./mmdb/dbip-asn-lite-2024-01.mmdb",
      city: "./mmdb/dbip-city-lite-2024-01.mmdb",
      country: "",
      anonymousIP: "",
      connectionType: "",
      domain: "",
      isp: "",
    },
  },
  links: [
    {
      name: "GitHub",
      url: "https://github.com/plechenko/ipsaur",
      icon:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAACXBIWXMAAAsTAAALEwEAmpwYAAACi0lEQVR4nJ3VW+jPdxgH8J/TBUrKIUuR5hAp1MytWhqFGRcUyoUxkbJw40ZIahe0DCkzN1tNMYdCUg4pqW2kjBxbxnJaI+fDSw/Pd338+/3+B0996/uc3s/z+byfz+dTq7Ug6IAxmIkl+cX/p+FrKb854CH4AXc0lvBtw+C2AHfFFrzAf9iOqQGSvq75Pw0/4kHGbkKXlsD74w+8xHr0bEVDvbAhc35Hv0aBPXApu57U6iWn4HPcx1X0bursiBN4hE+wAndxAOMzpjsG4mN0S9tEHMK9JH80HuPYewOAeUnajNT/wgVcL8isR3DIZVzB+cydlfa5FXhn3MLRouBTrEEnLEoyl2bybCxL2/xc/eZYRZF/HDcDO5QpWfGzdLbP7fnpvX1sRrAHN9Au9XGJOTmUHbnct3uGOemc3YYCX2XO9ILTaHJ7KGexuwg+gjOtBQ+JznER+wrbrzHytex+Y+EIgrfV2ij4OYoU+kbcjp9nWFc4YiJ2fECBnThX6GtjWGrJ9v+AOddt2qKQPKS7Cn0r/q5G6mThWJiEja1sLUkeuJA5he3U29HPeX+Fj+KywtAkLLj5ohq9BsAx0tPxb95hnYpr5zlWhTI8qy9LguVxr+RWTAcmFMBf5jVyO2Oi276FP7BeY1hlOJxdRFIlsapf8Fvq3xYA36VtfxymWEnh65GrP1gudVhOU8zu6bzfzzYpNqqI75v2+XW2bFdiveu+cC7OpAp4Z95Dy+N5rLP/0cTqJuDfZ+7iRqStU1+u1Il9WRVAH+zN2LWNhqJKXJC3acifycHDOnGxbfG0rkz+nuDrZsGL5EE5OTEJIdfqxPxT8LM7HqJWgTcBiRfsG4yo4xsZjwoGNAfyBrrYVblVzaxPAAAAAElFTkSuQmCC",
    },
  ],
};
