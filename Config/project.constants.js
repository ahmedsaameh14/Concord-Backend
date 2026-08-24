const PROJECT_TYPES = Object.freeze([
  'construction',
  'infrastructure',
  'transportation',
]);

/** @deprecated use PROJECT_TYPES — kept for query alias compatibility */
const PROJECT_SERVICES = PROJECT_TYPES;

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 50;

module.exports = {
  PROJECT_TYPES,
  PROJECT_SERVICES,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
};
