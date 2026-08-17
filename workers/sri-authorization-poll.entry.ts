import "dotenv/config";
import { startSriAuthorizationPollWorker } from "./sri-authorization-poll";

startSriAuthorizationPollWorker();

console.log("[worker:sri-auth] process running");
