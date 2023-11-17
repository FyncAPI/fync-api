import { populateById, populateByIds } from "../db.ts";

/**
 * Translates URL query parameters into MongoDB aggregation stages for population.
 *
 * @param {URLSearchParams} query - The URLSearchParams object containing query parameters.
 * @returns {Array<Object>} An array of MongoDB aggregation stages for population.
 *
 * @example
 * // Sample usage:
 * // Assuming query parameter: ?filter=friends,apps
 * const query = new URLSearchParams(window.location.search);
 * const aggregationStages = queryTranslator(query);
 * // Result: [ { $lookup: { from: 'users', localField: 'friends.user', foreignField: '_id', as: 'friends.user' } }, ... ]
 */
export function queryTranslator(query: URLSearchParams): Array<object> {
  // filter example = "friends,apps"
  const filter = query.get("filter");
  const stages: (
    | {
        $lookup: {
          from: string;
          localField: string;
          foreignField: string;
          as: string;
        };
        $unwind?: undefined;
      }
    | {
        $unwind: { path: string; preserveNullAndEmptyArrays: boolean };
        $lookup?: undefined;
      }
    | { $unwind: string; $lookup?: undefined; $group?: undefined }
    | {
        $group: {
          [x: string]:
            | string
            | { $push: { $arrayElemAt: (string | number)[] } };
          _id: string;
        };
        $unwind?: undefined;
        $lookup?: undefined;
      }
  )[] = [];
  if (filter) {
    filter.split(",").map((field) => {
      if (populatable.includes(field)) {
        if (field === "friends") {
          stages.push(...populateById("users", "friends.user"));
        } else stages.push(...populateByIds(field, field));
      }
    });
  }
  return stages;
}

const populatable = ["friends", "apps", "appUsers"];
