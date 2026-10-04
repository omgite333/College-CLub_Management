import app from "./app";
import { config } from "./config";

// eslint-disable-next-line no-console
console.log(`API listening on port ${config.port}`);
app.listen(config.port);
