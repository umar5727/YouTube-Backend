import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";


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
// refreshing the token
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
//change password
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
//geting current user
const currentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(
            new ApiResponse(200, req.user, "user fetch successfully")
        )
})
// update fullName or email
const updateAccount = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body
    if (!(fullName || email)) {
        throw new ApiError(401, 'field required')
    }

    const user = await User.findByIdAndUpdate(
        req.body.user?._id,
        {
            $set: {
                fullName,
                email
            }
        },
        {
            new: true
        }
    ).select("--password")

    return res
        .status(200)
        .json(
            new ApiResponse(200, user, 'changes updated successfully')
        )
})
// update avatar 
const updateAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(401, 'file not found')
    }
    const avatar = uploadOnCloudinary(avatarLocalPath)
    if (!avatar.url) {
        throw new ApiError(500, 'unable to upload on cloudinary')
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        { new: true }
    ).select("--password")

    return res
        .status(200)
        .json(
            new ApiResponse(200, user, 'avatar updated successfully')
        )
})
// update coverImage 
const updateCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(401, 'file not found')
    }
    const coverImage = uploadOnCloudinary(coverImageLocalPath)
    if (!coverImage.url) {
        throw new ApiError(500, 'unable to upload on cloudinary')
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        { new: true }
    ).select("--password")

    return res
        .status(200)
        .json(
            new ApiResponse(200, user, 'coverImage updated successfully')
        )
})


// aggregation pipeline

//pipeline for channel subscribed and subscribers
const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params // getting user from url

    if (!username) {
        throw new ApiError(401, 'username not found')
    }

    const channel = await User.aggregate(
        {
            $match: {       //$match- find all the userName matched 'subscription model'
                userName: username?.toLowerCase()
            },
            $lookup: {          // lookes in subscription model perticular channel name
                from: "subscription",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"       //return as subscribers 
            },
            $lookup: {     //looking in subscription model perticular subscriber that has  subscribed to many channels
                from: "subscription",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"  //all 'subscribed channels' -'subscription model'  return as subscribedTo
            },
            $addFields: {   //$addFields add extra fields to model
                subscribersCount: {
                    $size: "subscribers"  //$size is like total number
                },
                channelsSubscribedToCount: {
                    $size: "subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "subscribers.subscriber"] },
                        then: true,
                        else: false
                    }
                }
            },
            $project: {  //$project is use to show only fields
                fullName: 1,
                userName: 1,
                email: 1,
                avatar: 1,
                coverImage: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1
            }
        }

    )

    if (!channel?.length) {
        throw new ApiError(404, "channel does not exist")
    }
    return res
        .status(200)
        .json(
            new ApiResponse(200, channel[0], 'User channel fetched successfully')
        )
})

//pipeline for watch history
const getwatchHistory = asyncHandler(async (req, res) => {
    const user = User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user?._id)
            },
            $lookup: {
                from: "Video",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "video",
                            localField: "owner",
                            foreignField: "_id",
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }


                ]
            }
        }
    ])

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user[0].watchHistory,
                'watch history fetched successfully'
            )
        )

})


//
export { registerUser, loginUser, logOutUser, refreshAccessToken, changePassword, currentUser, updateAccount, updateAvatar, updateCoverImage, getUserChannelProfile, getwatchHistory }