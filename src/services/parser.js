export const parseQuery = (q) => {
  if (!q) return null;

  const query = q.toLowerCase();
  const filters = {};

  const genders = [];
  if (query.includes("female")) genders.push("female");
  if (/\bmale\b/.test(query) || (query.includes("male") && !query.includes("female"))) {
     if (!genders.includes("male")) genders.push("male");
  };
  if (genders.length) filters.gender = [...new Set(genders)];

  const groups = ["teenager", "adult", "senior", "child"];
  for (const group of groups) {
    if (query.includes(group)) {
      filters.age_group = group;
    }
  }

  if (query.includes("young")) {
    filters.min_age = 16;
    filters.max_age = 24;
  }

  const aboveMatch = query.match(/above\s+(\d+)/);
  if (aboveMatch) {
    filters.min_age = Number(aboveMatch[1]);
    delete filters.max_age; // prevent conflict with "young"
  }

  const countryMap = {
    nigeria: "NG",
    kenya: "KE",
    angola: "AO",
    morocco: "MA",
    ethiopia: "ET",
    ghana: "GH",
    cameroon: "CM",
    uganda: "UG"
  };

  for (const name in countryMap) {
    if (query.includes(name)) {
      filters.country_id = countryMap[name];
    }
  }

  return Object.keys(filters).length ? filters : null;
};