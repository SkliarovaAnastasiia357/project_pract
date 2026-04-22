import { loadEnv } from "./config/env.js";

const env = loadEnv();
console.log(JSON.stringify({ level: "info", msg: "env parsed ok", nodeEnv: env.NODE_ENV, port: env.PORT }));
