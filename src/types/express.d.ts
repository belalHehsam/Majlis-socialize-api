import "express";
import type { File as MulterFile } from "multer";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
        username:string;
        avatar?:string;
      };
      file?: MulterFile;
    }
  }
}
