import mongoose from "mongoose"

export { }

declare global {
  var _mongoose: {
    conn: mongoose.Connection | null
    promise: Promise<mongoose.Mongoose> | null
  }
}
