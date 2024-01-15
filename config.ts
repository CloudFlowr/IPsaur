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
      name: "Website",
      url: "https://cloudflowr.github.com/ipsaur",
      icon:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAAACXBIWXMAAAsTAAALEwEAmpwYAAABAklEQVR4nOXTvUrDUBgG4Po7KBWESkcXRxfvwEHcHQJeRHF07iW0o+Ii3oI4iFCcBOnu4ibUVXAQB30k+ImhTWqjARFfeJec8z3JCUmt9tvBVNqq0Rkc4hhzVaELOPWZc9R/ijZwFeB1VFxrfBddxU1AF1jCIs7i2i3WyqLruAvgJPteMYujWLvHxqToJh5isIvpgi+kHXsesf0VuoMnvGJ/gofYwwuesVu0qRWb0nQmOt77XCdm0tlW0bE+0i4BD892R34kJMNw+s1ieaj1HDgZd/ckB+4ZTa9K+DJaObwS/WdwHwfRQQ48yKz3y8B5ycJ5GQs3sVXQ+WjRerMQ/hN5A02ixDv6JGl+AAAAAElFTkSuQmCC",
    },
    {
      name: "Wiki",
      url: "https://github.com/cloudflowr/ipsaur/wiki",
      icon:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAAACXBIWXMAAAsTAAALEwEAmpwYAAABWUlEQVR4nO3Sv0tXURjH8SsqioYSLQ4OLk2uEnxXbWkIXGrQQXHQUbCvBJKbQlC2iIvQokP0DwSNOms0OKiDkoOIGIqLldBLDj7K4Yv5awgE33CH+z7nfp5zn+cUxT13G3ThdfaUUYvnmRsIV85cO0oV33blwd2YccpfvEcderET/sy9xW98RQeeYj72zKasi06+GBt6MjcS7l2892Mfj7I9H/AdVf9qybMIWcpcPbZxiBb8wKtsvQkHeHlZr6vwLcJLmU99TaxgMxWrWFtH9VWDfBEhnzLXiN3wvZlPw9zC4KWhiVQZa/iD1szPRfB5SJpFtKmuuA5Or1ZiMt5bcYRf2EBN+GWMXis0+8U0pJ9owEcs4E0U7ENnDK25uAkYjpApHONJ3IA9rOILJm4UmoiTng3sc+bHwqXWtBS3AeMxxMeZexAFp28VmsDDdMKiAgyhrdLf8385AaShAgmYqJfXAAAAAElFTkSuQmCC",
    },
    {
      name: "Github",
      url: "https://github.com/cloudflowr/ipsaur",
      icon:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAACXBIWXMAAAsTAAALEwEAmpwYAAACi0lEQVR4nJ3VW+jPdxgH8J/TBUrKIUuR5hAp1MytWhqFGRcUyoUxkbJw40ZIahe0DCkzN1tNMYdCUg4pqW2kjBxbxnJaI+fDSw/Pd338+/3+B0996/uc3s/z+byfz+dTq7Ug6IAxmIkl+cX/p+FrKb854CH4AXc0lvBtw+C2AHfFFrzAf9iOqQGSvq75Pw0/4kHGbkKXlsD74w+8xHr0bEVDvbAhc35Hv0aBPXApu57U6iWn4HPcx1X0bursiBN4hE+wAndxAOMzpjsG4mN0S9tEHMK9JH80HuPYewOAeUnajNT/wgVcL8isR3DIZVzB+cydlfa5FXhn3MLRouBTrEEnLEoyl2bybCxL2/xc/eZYRZF/HDcDO5QpWfGzdLbP7fnpvX1sRrAHN9Au9XGJOTmUHbnct3uGOemc3YYCX2XO9ILTaHJ7KGexuwg+gjOtBQ+JznER+wrbrzHytex+Y+EIgrfV2ij4OYoU+kbcjp9nWFc4YiJ2fECBnThX6GtjWGrJ9v+AOddt2qKQPKS7Cn0r/q5G6mThWJiEja1sLUkeuJA5he3U29HPeX+Fj+KywtAkLLj5ohq9BsAx0tPxb95hnYpr5zlWhTI8qy9LguVxr+RWTAcmFMBf5jVyO2Oi276FP7BeY1hlOJxdRFIlsapf8Fvq3xYA36VtfxymWEnh65GrP1gudVhOU8zu6bzfzzYpNqqI75v2+XW2bFdiveu+cC7OpAp4Z95Dy+N5rLP/0cTqJuDfZ+7iRqStU1+u1Il9WRVAH+zN2LWNhqJKXJC3acifycHDOnGxbfG0rkz+nuDrZsGL5EE5OTEJIdfqxPxT8LM7HqJWgTcBiRfsG4yo4xsZjwoGNAfyBrrYVblVzaxPAAAAAElFTkSuQmCC",
    },
    // {
    //   name: "Discord",
    //   url: "https://discord.com/ipsaur",
    //   icon:
    //     "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAACXBIWXMAAAsTAAALEwEAmpwYAAAB2klEQVR4nO3VzYuNYRgG8JNi0pyxmZEazXZmgQX+BPbCykcTMr5200SN2YwkG2QssJYVSkiUmIwVZeNjWIoiH5FEvuqnJ/epZx7vnDmZ7Vz11DnXfV3X3XvfT+9bq81htsBCtFfw7an2v6HLcQyTeIqBCs1A1J/hOFa0ErwAp/EVZ9GLZdiLEzgfJ/3eF7Xe0CbPGcxv1mDYX+zHVjw2Mx6FNnkSDkwX3oEvFQGvcQ6D2BJnMLg3FfrPVTtLDbaF4CVe4D76mz1yjDRpHoTnVWT0V4nvRHHHjMuaBtgZGbfLQh2/4nRl/Go8x0TBdwWXaqsyfjF+4+eUMWFtdB4vGl/NZjuc8Qcz/krhuRv8mpw8FOThQnwxCxrK+KGMv1B4jgQ/mpPXg1xXiPtwLxp1ZPwiXIox9RWeDZF1LSfTLMVNuoxbWD9lUU2AjeFJ3u2RNZkLPgWZlpxjHJvQWRHaic3ZzBtIS074mIvT1huYiFfD+8KY/j+J86GovcOeGGcDP/IGp7LCd4xgCXbjJr75F4m7gV2hHQlvA2N5g3lxk/KgtziJ7qj3YGWcnuCWpqB4grzxaKpXLSuFHY0xJDxEW5PltoVGvBiTt7vVm1Fv5YMSH6R6S6FzqFXgD+Zvr92EZGYrAAAAAElFTkSuQmCC",
    // },
    // {
    //   name: "Donate",
    //   url: "https://paypal.me/ipsaur",
    //   icon:
    //     "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAACXBIWXMAAAsTAAALEwEAmpwYAAACDUlEQVR4nO3ZvWsTYRzA8bNWoYqigv+B1lIUBQUnxc1FUBwcOzopKuLLqgi6KgWF4mIVBP8DG118QQWhFEVxcawvIEg6+EY+cvgUQrweueSa3AP5wkGG5Ec+XPLk8lySDBo0aNCgKodtuIAa3mEBPzGPx7iEnQXm7cLl8Nr5MGshzJ7BeYyWCdiDR9rvCfbnzDuApwXm1bC7G8AqTKKheOlrbmGkad4IpjqYtTjvBoaLIjaGU95tz8OsTXhRwrwaNhQ5E2UgFnsWQGVVa+vMhI9T1bvezhe7k+9Er2vkLgAFV6d+N7MUYkx8jWZBLoqvc1mQ9Nc0th5mQT6Ir/dZkLr4qmdB0ou22PqRBfkqvj5nQebE12wW5L74upcFOSu+TmdBtouvsf8gAfNGPM1lIgLklHg6mQdZmy5pqt8XrFsSEjBnVL8TuYgAGcZr1W227U0I7Ah7TFWrnq6ubSGaMEcr9re3gWOFEE2Yq6rTlY4QAbISd/stwB0MdQwJmCHc7iNiqmtEC+ZmHxCTWFEKogV0HL97APiT7vyXDmjBHMS3ZUR8x6FlRTRhtuLVMiBeYktPEC1XAOmNn18lANKP6zWs7imiBbS3y62kj9iXVCGsSXfIO/x9yL+K7Uc4gk9tANLnHE6qnH93qKZzEA+wOYklTLRcQaePJ5IYwzjehmM8iTmsT49+v49BSY/7C4NWh4chZ3uhAAAAAElFTkSuQmCC",
    // },
  ],
};
