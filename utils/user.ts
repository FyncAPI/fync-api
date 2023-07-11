import { AggregatePipeline } from "https://deno.land/x/mongo@v0.31.2/mod.ts";
import { populateById, populateByIds } from "../db.ts";

export function queryTranslator(query: URLSearchParams) {
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
        if (field === "friends")
          stages.push(...populateById("users", "friends.user"));
        else stages.push(...populateByIds(field, field));
      }
    });
  }
  return stages;
}

const populatable = ["friends", "apps", "appUsers"];
