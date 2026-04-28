import Profile from "../models/Profile.js";
import { buildMongoQuery } from "../services/queryBuilder.js";
import { buildOptions } from "../services/queryBuilder.js";
import { parseQuery } from "../services/parser.js";
import { validateQueryParams } from "../utils/validateQuery.js";

export const searchProfiles = async (req, res) => {
  try {
    const { q, page: rawPage, limit: rawLimit } = req.query;

    if (!q || q.trim() === "") {
      return res.status(400).json({
        status: "error",
        message: "Missing or empty search query"
      });
    }

    const filterParams = parseQuery(q);

    if (!filterParams || Object.keys(filterParams).length === 0) {
      return res.status(400).json({
        status: "Bad Request",
        message: "Unable to interpret query"
      });
    }

    const error = validateQueryParams(req.query);
    if (error) {
      return res.status(422).json({
        status: "error",
        message: "Invalid query parameters"
      });
    }

    const queryObj = buildMongoQuery(filterParams);
    const { limit, skip, sort, page } = buildOptions({ page: rawPage, limit: rawLimit });

    const [data, total] = await Promise.all([
      Profile.find(queryObj).sort(sort).skip(skip).limit(limit),
      Profile.countDocuments(queryObj)
    ]);

    res.status(200).json({
      status: "success",
      page,
      limit,
      total,
      data
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "error", message: "Server failure" });
  }
};


export const getProfiles = async (req, res) => {
  try {
    const error = validateQueryParams(req.query);

    if (error) {
      return res.status(422).json({
        status: "error",
        message: error
      });
    }

    const queryObj = buildMongoQuery(req.query);
    const { limit, skip, sort, page } = buildOptions(req.query);

    const [data, total] = await Promise.all([
      Profile.find(queryObj).sort(sort).skip(skip).limit(limit),
      Profile.countDocuments(queryObj)
    ]);

    return res.status(200).json({
      status: "success",
      page,
      limit,
      total,
      data
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: "error",
      message: "Server error"
    });
  }
};