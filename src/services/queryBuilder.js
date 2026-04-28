export const buildMongoQuery = (params) => {
  const query = {};

  // 1. Gender (supports single value or array for "male and female")
  if (params.gender) {
    query.gender = Array.isArray(params.gender)
      ? { $in: params.gender }
      : params.gender;
  }

  // 2. Age Group (CRITICAL FIX: must be independent)
  if (params.age_group) {
    query.age_group = params.age_group;
  }

  // 3. Country ID (Force uppercase to match DB)
  if (params.country_id) {
    query.country_id = params.country_id.toUpperCase();
  }

  // 4. Age Ranges
  if (params.min_age || params.max_age) {
    query.age = {};
    if (params.min_age) query.age.$gte = Number(params.min_age);
    if (params.max_age) query.age.$lte = Number(params.max_age);
  }

  // 5. Probabilities
  if (params.min_gender_probability !== undefined) {
    query.gender_probability = { $gte: Number(params.min_gender_probability) };
  }

  if (params.min_country_probability !== undefined) {
    query.country_probability = { $gte: Number(params.min_country_probability) };
  }

  return query;
};

export const buildOptions = (params) => {
  const limit = Math.min(Number(params.limit) || 10, 50);
  const page = Number(params.page) || 1;

  const skip = (page - 1) * limit;

  const sort = {};
  const allowedSort = ["age", "created_at", "gender_probability"];

  if (params.sort_by && allowedSort.includes(params.sort_by)) {
    sort[params.sort_by] = params.order === "desc" ? -1 : 1;
  }

  return { limit, skip, sort, page };
};

export const buildPaginationMeta = ({ page, limit, total, baseUrl, query }) => {
  const total_pages = Math.ceil(total / limit);

  const queryString = new URLSearchParams(query);

  const buildLink = (p) => {
    queryString.set("page", p);
    queryString.set("limit", limit);
    return `${baseUrl}?${queryString.toString()}`;
  };

  return {
    total_pages,
    links: {
      self: buildLink(page),
      next: page < total_pages ? buildLink(page + 1) : null,
      prev: page > 1 ? buildLink(page - 1) : null
    }
  };
};