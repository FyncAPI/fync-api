import { Collection, MongoClient, ObjectId } from "mongo";
import "https://deno.land/std@0.127.0/dotenv/load.ts";

const envVars = Deno.env.toObject();
const client = new MongoClient();

// console.log(
//   JSON.parse(envVars.DB_SERVERS).map((uri: string) => {
//     return {
//       host: uri,
//       port: 27017,
//     };
//   })
// );
// await client.connect("mongodb://127.0.0.1:27017");
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
    $unwind: "$" + fieldName,
  },
  {
    $lookup: {
      from: collectionName,
      localField: fieldName,
      foreignField: "_id",
      as: fieldName,
    },
  },
  {
    $group: {
      _id: "$_id",
      [fieldName]: { $push: { $arrayElemAt: [`$${fieldName}`, 0] } },
      // use $arrayElemAt to get the first element of the array returned by the lookup
    },
  },
];
