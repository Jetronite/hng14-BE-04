export const validateQueryParams = (query) => {
  const { min_age, max_age, limit, page } = query;

  const isInvalidNumber = (val) =>
    val !== undefined && (val === "" || Number.isNaN(Number(val)));

  if (isInvalidNumber(min_age)) return "Invalid min_age";
  if (isInvalidNumber(max_age)) return "Invalid max_age";

  if (min_age && max_age && Number(min_age) > Number(max_age)) {
    return "min_age cannot be greater than max_age";
  }

  if (isInvalidNumber(limit) || (limit && Number(limit) > 50)) {
    return "Invalid limit";
  }

  if (isInvalidNumber(page)) return "Invalid page";

  return null;
};