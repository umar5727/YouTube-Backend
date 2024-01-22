import mongoose, { Schema } from "mongoose";

const userSchema = new Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        fullName: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
            index: true
        },
        avatar: {
            type: String,  //cloudinary image url
            required: true
        },
        coverImage: {
            type: String,   //cloudinary image url
            required: true
        },
        watchHistory: [
            {
                type: Schema.Types.ObjectId,
                ref: 'video'
            }
        ],
        password: {
            type: String,
            required: [true, 'password is required']
        },
        refreshToken: {
            type: String
        }

    },
    {
        timestamps: true
    }

)

export const User = mongoose.model('User', userSchema)