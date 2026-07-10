import mongoose from "mongoose";

let isConnected = false;

export async function connectDB(): Promise<void> {
  if (isConnected) return;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI environment variable is required.");
  }

  try {
    await mongoose.connect(uri, { dbName: "wanderway" });
    isConnected = true;
    console.log("✅ Connected to MongoDB Atlas (wanderway)");
  } catch (error) {
    console.error("❌ Failed to connect to MongoDB:", error);
    throw error;
  }

  mongoose.connection.on("error", (err) => {
    console.error("MongoDB runtime error:", err);
    isConnected = false;
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("⚠️ MongoDB disconnected.");
    isConnected = false;
  });
}

export async function disconnectDB(): Promise<void> {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
  console.log("MongoDB disconnected gracefully.");
}
