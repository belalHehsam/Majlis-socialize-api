import { PipelineStage } from "mongoose";

export class AggregateFeatures {
  public pipleLine: PipelineStage[] = [];
  private queryString: Record<string, any>;
  public page: number;
  public limit: number;
  public skip: number;

  constructor(queryString: Record<string, any>) {
    this.queryString = queryString;
    this.page = Number(queryString.page) || 1;
    this.limit = Number(queryString.limit) || 10;
    this.skip = (this.page - 1) * this.limit;
    console.log("queryString", this.queryString);
    console.log("page", this.page);
    console.log("limit", this.limit);
  }

  match(criteria: Record<string, any>) {
    this.pipleLine.push({
      $match: criteria,
    });
    return this;
  }

  sort(defaultSort: Record<string, any>) {
    if (this.queryString.sort) {
      const sortFields = this.queryString.sort.split(",");
      const sortObject: Record<string, 1 | -1> = {};

      sortFields.forEach((field: string) => {
        if (field.startsWith("-")) {
          sortObject[field.substring(1)] = -1;
        } else sortObject[field] = 1;
      });

      this.pipleLine.push({
        $sort: sortObject,
      });
    } else {
      this.pipleLine.push({
        $sort: defaultSort,
      });
    }
    return this;
  }

  paginate() {
    this.pipleLine.push(
      {
        $skip: this.skip,
      },
      { $limit: this.limit }
    );
    return this;
  }

  buildPagination(totalResults: number, currentResults: number) {
    return {
      page: this.page,
      limit: this.limit,
      totalResults,
      hasNextPage: this.skip + currentResults < totalResults,
    };
  }
}
