import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
    // res.status(200).json({
    //     message: 'first response '
    // })

    const { fullName, email, userName, password } = req.body
    console.log("fullname: " + fullName + " email: " + email)

    if (
        [fullName, email, userName, password].some((fields) =>
            fields.trim() === '')
    ) {
        throw new ApiError(400, 'All fields required')
    }

    const existedUser = User.findOne({
        $or: [{ userName }, { email }]
    })
    if (existedUser) {
        throw new ApiError(409, "email or username already exists")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if (!avatarLocalPath) {
        throw new ApiError(409, "avatar is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new ApiError(409, "avatar is required")
    }

    // uploading uer data to db\

    const user = await User.create({
        fullName,
        userName: userName.toLowerCase(),
        email,
        password,
        avatar,
        coverImage: coverImage?.url || ""
    })
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "somthing went wrong while registring user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "user registered successfully")
    )
})

export { registerUser }