import Profile from "../models/Profile.js";
import { buildMongoQuery, buildOptions, buildPaginationMeta } from "../services/queryBuilder.js";
import { parseQuery } from "../services/parser.js";
import { validateQueryParams } from "../utils/validateQuery.js";
import { Parser } from "json2csv";

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

export const createProfile = async (req, res) => {
  try {
    const profile = await Profile.create(req.body);

    return res.status(201).json({
      status: "success",
      data: profile
    });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      status: "error",
      message: "Server error"
    });
  }
};


export const deleteProfile = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Profile.findOneAndDelete({ id });

    if (!deleted) {
      return res.status(404).json({
        status: "error",
        message: "Profile not found"
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Profile deleted successfully"
    });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      status: "error",
      message: "Server error"
    });
  }
};

export const exportProfiles = async (req, res) => {
  try {
    // 1. REUSE Validation
    const error = validateQueryParams(req.query);
    if (error) return res.status(422).json({ status: "error", message: error });

    // 2. REUSE Query Logic (This is the "Golden Rule" check)
    const queryObj = buildMongoQuery(req.query);
    const { sort } = buildOptions(req.query); // Only take sort, ignore pagination

    // 3. Fetch data (Full set, no .limit() or .skip())
    const data = await Profile.find(queryObj).sort(sort).lean();

    const fields = ["id", "name", "gender", "age", "country_name", "created_at"];
    const parser = new Parser({ fields });
    const csv = parser.parse(data);

    res.header("Content-Type", "text/csv");
    res.attachment(`profiles_${Date.now()}.csv`);
    return res.send(csv);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Export failed" });
  }
};