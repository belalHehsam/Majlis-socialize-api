import type { Query, Document, QueryFilter } from "mongoose";
import { AppError } from "./appError";

type QueryString = {
  page?: string | number;
  limit?: string | number;
  sort?: string | string[];
  fields?: string | string[];
} & Record<string, unknown>;

class APIFeatures<T extends Document> {
  query: Query<T[], T>;
  queryString: QueryString;

  constructor(query: Query<T[], T>, queryString: QueryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter(): this {
    const queryObj = { ...this.queryString };
    const excludedFields = ["page", "sort", "limit", "fields"] as const;
    excludedFields.forEach((el) => delete queryObj[el]);

    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    this.query = this.query.find(JSON.parse(queryStr) as QueryFilter<T>);
    return this;
  }

  sort(): this {
    if (this.queryString.sort) {
      const sortBy = Array.isArray(this.queryString.sort)
        ? this.queryString.sort.join(" ")
        : (this.queryString.sort as string).split(",").join(" ");
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort("-createdAt");
    }
    return this;
  }

  limitFields(): this {
    if (this.queryString.fields) {
      const fields = Array.isArray(this.queryString.fields)
        ? this.queryString.fields.join(" ")
        : (this.queryString.fields as string).split(",").join(" ");
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select("-__v");
    }
    return this;
  }

  paginate(): this {
    const page = Math.max(1, Number(this.queryString.page) || 1);
    const limit = Math.min(1000, Math.max(1, Number(this.queryString.limit) || 100));

    if (Number.isNaN(page) || Number.isNaN(limit)) {
      throw new AppError("Page and limit must be valid numbers", 400);
    }

    this.query = this.query.skip((page - 1) * limit).limit(limit);
    return this;
  }
}

export default APIFeatures;
