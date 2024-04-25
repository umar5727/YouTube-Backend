import { Router } from "express";
import { changePassword, logOutUser, loginUser, refreshAccessToken, registerUser } from "../controllers/user.controller.js";
import { Upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route('/register').post(
    Upload.fields([
        {
            name: 'avatar',
            maxCount: 1
        },
        {
            name: 'coverImage',
            maxCount: 1
        }
    ]),
    registerUser
)
router.route('/login').post(loginUser)

//secure routes 
router.route('/logout').post(verifyJWT, logOutUser)
router.route('/refresh-token').post(refreshAccessToken)
router.route('/changePassword').post(changePassword)

export default router