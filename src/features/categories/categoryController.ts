import { Request, Response } from "express";
import jsend from "../../utils/jsend";
import * as categoryService from "./categoryService";

export const listCategories = async (req: Request, res: Response) => {
  const categories = await categoryService.listCategories();
  res.status(200).json(
    jsend.success({
      data: categories,
      message: "Categories retrieved successfully",
    })
  );
};
