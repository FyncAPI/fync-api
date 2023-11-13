export const populate = (
  col: string,
  local: string,
  localAs?: string,
  field?: string,
) => [
  {
    $lookup: {
      from: col,
      localField: local,
      foreignField: field || "_id",
      as: localAs || local,
    },
  },
  {
    $unwind: {
      path: "$" + (localAs || local),
      preserveNullAndEmptyArrays: true,
    },
  },
];

export const populateArray = (
  col: string,
  local: string,
  field?: string,
  localAs?: string,
) => [
  {
    $lookup: {
      from: col,
      localField: local,
      foreignField: field || "_id",
      as: localAs || local,
    },
  },
];

export const populateEmbeddedById = (col: string, local: string) => [
  {
    $lookup: {
      from: col,
      localField: local + "._id",
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
