import { Router } from "express";
import { authorize } from "../../middlewares/authMiddleware";
import { validate } from "../../middlewares/validateMiddleware";
import { asyncWrapper } from "../../utils/asyncWrapper";
import {
    createComment,
    deleteComment,
    getCommentById,
    getComments,
    updateComment,
} from "./commentController";
import {
    commentIdParamSchema,
    createCommentSchema,
    getCommentsQuerySchema,
    updateCommentSchema,
} from "./commentValidator";

const router = Router();

router.get("/", validate(getCommentsQuerySchema), asyncWrapper(getComments));

router.get(
    "/:id",
    validate(commentIdParamSchema),
    asyncWrapper(getCommentById)
);

router.post(
    "/",
    authorize,
    validate(createCommentSchema),
    asyncWrapper(createComment)
);

router.put(
    "/:id",
    authorize,
    validate(updateCommentSchema),
    asyncWrapper(updateComment)
);

router.delete(
    "/:id",
    authorize,
    validate(commentIdParamSchema),
    asyncWrapper(deleteComment)
);

export default router;