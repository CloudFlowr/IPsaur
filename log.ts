type LogLevel = "FATAL" | "ERROR" | "INFO" | "VERBOSE" | "DEBUG";
export function log(level: LogLevel, ...message: (number | string | object)[]) {
  console.log(new Date().toJSON(), level, ...message);
}
