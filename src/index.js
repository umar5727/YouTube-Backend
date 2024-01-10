// require('dotenv').config({ path: './env' })
import 'dotenv/config'
// import dotenv from 'dotenv'
import connectDB from "./db/index.js";   // const { default: connectDB } = require('./db') 

// dotenv.config({
//     path: './env'
// })
connectDB();