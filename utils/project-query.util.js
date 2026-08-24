const {
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  PROJECT_TYPES,
} = require('../Config/project.constants');

const toArrayParam = (value) => {
  if (value == null || value === '') return [];
  const raw = Array.isArray(value) ? value : String(value).split(',');
  return [...new Set(raw.map((item) => String(item).trim().toLowerCase()).filter(Boolean))];
};

const parsePagination = (query = {}) => {
  const page = Math.max(parseInt(query.page, 10) || DEFAULT_PAGE, 1);
  const limit = Math.min(
    Math.max(parseInt(query.limit, 10) || DEFAULT_LIMIT, 1),
    MAX_LIMIT
  );
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const buildPublicProjectFilter = (query = {}) => {
  const filter = { isActive: true };

  const locations = toArrayParam(query.locations);
  if (locations.length === 1) {
    filter.location = locations[0];
  } else if (locations.length > 1) {
    filter.location = { $in: locations };
  }

  // Frontend may send ?services= or ?types= — both filter the `type` field
  const types = toArrayParam(query.types || query.services).filter((type) =>
    PROJECT_TYPES.includes(type)
  );
  if (types.length === 1) {
    filter.type = types[0];
  } else if (types.length > 1) {
    filter.type = { $in: types };
  }

  if (query.search) {
    const search = String(query.search).trim();
    if (search) {
      filter.$text = { $search: search };
    }
  }

  return filter;
};

module.exports = {
  toArrayParam,
  parsePagination,
  buildPublicProjectFilter,
};
