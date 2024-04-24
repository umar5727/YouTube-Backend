import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors"

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

// types of data except settings

app.use(express.json({limit: '16kb'}))   //limit the json data excepted
app.use(express.urlencoded({extended:true, limit: '16kb'})) //data comming from url
app.use(express.static("public"))    //general data on server
app.use(cookieParser())     //data except from cookies of website


// routes import 

import userRouter from './routes/user.routes.js'

//routes declaration

app.use("/api/v1/users",userRouter)     //v1 is for version of code 

// app.use("/api/v1/")


export { app }