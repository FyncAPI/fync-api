import { Collection, MongoClient, ObjectId } from "mongo";
import "https://deno.land/std@0.127.0/dotenv/load.ts";

const envVars = Deno.env.toObject();
const client = new MongoClient();

await client.connect({
  db: envVars.DB_NAME,
  tls: true,
  servers: JSON.parse(envVars.DB_SERVERS).map((uri: string) => {
    return {
      host: uri,
      port: 27017,
    };
  }),

  credential: {
    username: envVars.DB_USERNAME,
    password: envVars.DB_PASSWORD,
    db: envVars.DB_NAME,
    mechanism: "SCRAM-SHA-1",
  },
});

export const db = client.database(envVars.DB_NAME);
