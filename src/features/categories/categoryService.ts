import Category from "../../models/Category";

export const listCategories = async () => {
  return Category.find().sort({ name: 1 });
};
