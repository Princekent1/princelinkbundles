import mongoose from "mongoose";

const connectMongo = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not defined");
  };
  const cached = global._mongoose ?? { conn: null, promise: null }
  try {
    if(cached.conn) return cached.conn;
    cached.promise ??= mongoose.connect(process.env.MONGO_URI);
    global._mongoose = cached
    cached.conn = (await cached.promise).connection
  } catch (e) {
    console.error("mongoose connect error:", e);
    cached.conn = null
    cached.promise = null
    global._mongoose = cached
    throw e
  }
};

export default connectMongo;
