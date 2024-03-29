import { Collection, MongoClient, ObjectId } from "mongo";
import "loadenv";

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

  retryWrites: true,
  credential: {
    username: envVars.DB_USERNAME,
    password: envVars.DB_PASSWORD,
    db: envVars.DB_NAME,
    mechanism: "SCRAM-SHA-1",
  },
});
// console.log(envVars.DB_URL);
// await client.connect(envVars.DB_URL);
export const db = client.database(envVars.DB_NAME);

export const populateById = (col: string, local: string) => [
  {
    $lookup: {
      from: col,
      localField: local,
      foreignField: "_id",
      as: local,
    },
  },
  {
    $unwind: {
      path: "$" + local,
      preserveNullAndEmptyArrays: true,
    },
  },
];

export const populateByIds = (collectionName: string, fieldName: string) => [
  {
    $unwind: {
      path: "$" + collectionName,
      preserveNullAndEmptyArrays: true,
    },
  },
  {
    $lookup: {
      from: collectionName,
      localField: fieldName,
      foreignField: "_id",
      as: fieldName,
    },
  },
];
