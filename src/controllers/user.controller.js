import { asyncHandler } from "../utils/asyncHandler.js";

const registerUser = asyncHandler(async (req, res) => {
    // res.status(200).json({
    //     message: 'first response '
    // })

    const { fullName, email, userName, password, avatar, coverImage } = req.body
    console.log("fullname: " + fullName + " email: " + email)
})

export { registerUser }