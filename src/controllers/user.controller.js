import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";


// generating access and refresh tokens
const genereateAccessAndRefreshToken = async (userId) => {
    const existedUser = await User.findById(userId);
    const accessToken = existedUser.generateAccessToken();
    const refreshToken = existedUser.generateRefreshToken();

    existedUser.refreshToken = refreshToken
    await existedUser.save({ validateBeforeSave: false })

    return { accessToken, refreshToken }
}

//user registration
const registerUser = asyncHandler(async (req, res) => {
    // res.status(200).json({
    //     message: 'first response '
    // })

    const { fullName, email, userName, password } = req.body
    // console.log("fullname: " + fullName + " email: " + email)

    if (
        [fullName, email, userName, password].some((fields) =>
            fields.trim() === '')
    ) {
        throw new ApiError(400, 'All fields required')
    }

    const existedUser = await User.findOne({
        $or: [{ userName }, { email }]   //$or is mongodb operator
    })
    if (existedUser) {
        throw new ApiError(409, "email or username already exists")
    }

    //const coverImageLocalPath = req.files?.coverImage[0]?.path;

    //checking the avatar is empty or not 
    let avatarLocalPath;
    if (req.files && Array.isArray(req.files.avatar) && req.files.avatar.length > 0) {
        avatarLocalPath = req.files.avatar[0].path;
    } else {
        throw new ApiError(409, "avatar is required")
    }
    // checking the  cover image is empty or not
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    } else {
        coverImageLocalPath = "";
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
        avatar: avatar.url,
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


// user login 
const loginUser = asyncHandler(async (req, res, next) => {
    // getting data from form
    const { email, userName, password } = req.body
    // checking if the required field is empty
    if (!(email || userName)) {
        throw new ApiError(400, "all fields required")
    }
    // checking the user in database
    const existedUser = await User.findOne(
        {
            $or: [{ email }, { userName }]
        }
    )

    if (!existedUser) {
        throw new ApiError(404, "user does not exist")
    }
    // checking the password is correct or not
    const isPasswordValid = await existedUser.isPasswordCorrect(password)
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials")
    }
    //generating the tokens
    const { accessToken, refreshToken } = await genereateAccessAndRefreshToken(existedUser._id)

    //getting the user from db without password and refresh token
    const logedInUser = await User.findById(existedUser._id).select("--password --refreshToken")


    const options = {            //by the optioncookies can only be modifyed by server only
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .cookie('accessToken', accessToken, options)
        .cookie('refreshToken', refreshToken, options)
        .json(
            new ApiResponse(
                200,
                { user: logedInUser, accessToken, refreshToken },
                'user logedin successfully'
            )
        )
})

//logout
const logOutUser = asyncHandler(async (req, res, next) => {
    await User.findByIdAndUpdate(
        req._id,
        {
            $set: {

                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )
    const options = {
        httpOnly: true,
        secure: true
    }
    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(200, '', 'User Logged Out')
        )
})

const refreshAccessToken = asyncHandler(async (req, res, next) => {
    const incommingRefreshToken = req.cookie.refreshToken || req.body.refreshToken
    if (!incommingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incommingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        const user = await User.findById(decodedToken?._id);
        if (!user) {
            throw new ApiError(401, 'invalid refresh token')
        }

        if (incommingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, 'refresh token is expire or used')
        }

        const { accessToken, newRefreshToken } = await genereateAccessAndRefreshToken(user._id)
        const options = {
            httpOnly: true,
            secure: true
        }

        return res
            .status(200)
            .cookie('accessToken', accessToken, options)
            .cookie('refreshToken', newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: newRefreshToken },
                    "Access Token Refresh successfully"
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Token invalid")
    }
})

const changePassword = asyncHandler(async (req, res, next) => {
    //getting old password and new password from req.body
    const { oldPassword, newPassword } = req.body
    //getting user details from db
    const user = await User.findById(req.user?._id)
    //checking old password is correct in db 
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
    if (!isPasswordCorrect) {
        throw new ApiError(401, "password is incorrect")
    }

    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(
            new ApiResponse(200, {}, "Password change successfully")
        )

})
const currentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(
            new ApiResponse(200, req.user, "user fetch successfully")
        )
})

export { registerUser, loginUser, logOutUser, refreshAccessToken, changePassword, currentUser }