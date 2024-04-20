import mongoose from "mongoose";
import { DB_Name } from "../constants.js";


const connectDB = async () => {
    try {
        // console.log(process.env.MONGODB_URI, "environment variable or env")
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_Name}`)
        console.log("MongoDB connected of Host: ", connectionInstance.connection.host);
    }
    catch (error) {
        console.log("MongoDB connection Failed", error);
        process.exit(1)
    }
}
export default connectDB