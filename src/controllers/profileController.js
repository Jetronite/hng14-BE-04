import Profile from "../models/Profile.js";
import { buildMongoQuery, buildOptions, buildPaginationMeta } from "../services/queryBuilder.js";
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

    const { total_pages, links } = buildPaginationMeta({
      page: options.page,
      limit: options.limit,
      total,
      baseUrl: "/api/profiles/search",
      query: req.query
    });

    res.status(200).json({
      status: "success",
      page,
      limit,
      total,
      total_pages,
      links,
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


    const { total_pages, links } = buildPaginationMeta({
      page,
      limit,
      total,
      baseUrl: "/api/profiles",
      query: req.query
    });


    return res.status(200).json({
      status: "success",
      page,
      limit,
      total,
      total_pages,
      links,
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