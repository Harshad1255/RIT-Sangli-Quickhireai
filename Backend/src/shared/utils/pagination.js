const paginate = (query, { page = 1, limit = 20, sort = '-createdAt' }) => {
  const skip = (Math.max(1, page) - 1) * limit;
  return query.skip(skip).limit(Math.min(100, limit)).sort(sort);
};

const buildFilter = (filters, allowedFields) => {
  const query = {};
  for (const [key, value] of Object.entries(filters)) {
    if (allowedFields.includes(key) && value !== undefined && value !== '') {
      if (key === 'search') {
        query.$text = { $search: value };
      } else if (Array.isArray(value)) {
        query[key] = { $in: value };
      } else {
        query[key] = value;
      }
    }
  }
  return query;
};

const paginationMeta = (total, page, limit) => ({
  total,
  page: Number(page),
  limit: Number(limit),
  totalPages: Math.ceil(total / limit),
  hasNext: page * limit < total,
  hasPrev: page > 1
});

module.exports = { paginate, buildFilter, paginationMeta };
