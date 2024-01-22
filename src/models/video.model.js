import mongoose, { Schema } from "mongoose";

const video = new Schema(
    {
        videoFile: {
            type: String, //cloudnary url
            required: true
        },
        thumbNail: {
            type: String, //cloudnary url
            required: true
        },
        duration: {
            type: String, //cloudnary give video duration
            required: true
        },
        title: {
            type: String,
            required: true
        },
        discription: {
            type: String,
            required: true
        },
        views: {
            type: Number,
            default: 0
        },
        isPublished: {
            type: Boolean,
            default: true
        },
        owner: {
            type: mongoose.Schema.ObjectId,
            ref: 'User'
        }
    },
    {
        timestamps: true
    }
)