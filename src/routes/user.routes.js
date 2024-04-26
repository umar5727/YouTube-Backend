import { Router } from "express";
import { changePassword, currentUser, getUserChannelProfile, getwatchHistory, logOutUser, loginUser, refreshAccessToken, registerUser, updateAccount, updateAvatar, updateCoverImage } from "../controllers/user.controller.js";
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
router.route('/changePassword').post(verifyJWT, changePassword)
router.route('/current-user').get(currentUser)
router.route('/update-account').patch(verifyJWT, updateAccount)
router.route('/update-avatar').patch(verifyJWT, Upload.single("avatar"), updateAvatar)
router.route('/update-coverImage').patch(verifyJWT, Upload.single("coverImage"), updateCoverImage)
router.route('/c/:username').get(verifyJWT, getUserChannelProfile)
router.route('/history').get(verifyJWT, getwatchHistory)
export default router