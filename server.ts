import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import crypto from "crypto";
import fs from "fs";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import pRetry from "p-retry";

import { connectDB } from "./db/connection";
import { UserModel } from "./db/models/User";
import { TripModel } from "./db/models/Trip";

dotenv.config({ path: ".env.local" });

// Standard Hampi Heritage Trail itinerary fallback (from Stitch UI design)
const HAMPI_FALLBACK_ITINERARY = {
  title: "Hampi Heritage Trail",
  durationDays: 4,
  travelersCount: 2,
  estimatedBudget: 50000,
  days: [
    {
      dayNumber: 1,
      title: "Arrival & Temple Trail",
      activities: [
        {
          id: "act-1",
          time: "10:00 AM",
          title: "Virupaksha Temple Visit",
          description: "Explore the ancient, continuously worshiped temple dedicated to Lord Shiva, featuring towering gopurams and intricate carvings.",
          bestPart: "The 50-meter gopuram is the highest in Hampi and a masterpiece of Dravidian architecture.",
          cost: 500,
          rating: 4.8,
          category: "culture",
          isMustSee: true,
          votesUp: 4,
          votesDown: 0,
          latitude: 15.3352,
          longitude: 76.4623
        },
        {
          id: "act-2",
          time: "01:30 PM",
          title: "Lunch at Mango Tree",
          description: "Relaxed riverside dining offering traditional thalis and continental options in a laid-back setting.",
          bestPart: "Enjoying a traditional South Indian meal served on banana leaves under mango trees.",
          cost: 1200,
          category: "food",
          isMustSee: false,
          votesUp: 2,
          votesDown: 0,
          latitude: 15.3364,
          longitude: 76.4682
        },
        {
          id: "act-2b",
          time: "03:30 PM",
          title: "Coracle Ride on Tungabhadra",
          description: "Take a relaxing ride in a traditional circular boat across the river to reach the hippie island side.",
          bestPart: "Floating peacefully near massive granite boulders and lush plantations under a clear blue sky.",
          cost: 400,
          category: "activity",
          isMustSee: false,
          votesUp: 2,
          votesDown: 2,
          latitude: 15.3412,
          longitude: 76.4645
        }
      ]
    },
    {
      dayNumber: 2,
      title: "Royal Enclosure",
      activities: [
        {
          id: "act-3",
          time: "09:00 AM",
          title: "Royal Enclosure Ruins",
          description: "The fortified royal center of the Vijayanagara Empire, with underground chambers and stepped tank architecture.",
          bestPart: "The Mahanavami Dibba and the stunning Stepped Tank are the architectural crown jewels.",
          cost: 300,
          rating: 4.6,
          category: "culture",
          isMustSee: true,
          votesUp: 3,
          votesDown: 0,
          latitude: 15.3218,
          longitude: 76.4682
        },
        {
          id: "act-4",
          time: "02:00 PM",
          title: "Elephant Stables",
          description: "An 11-domed structure that once housed the royal ceremonial elephants, known for its Indo-Islamic architecture.",
          bestPart: "The unique symmetrical 11 domes showcasing a blend of Hindu and Islamic design.",
          cost: 200,
          rating: 4.7,
          category: "culture",
          isMustSee: true,
          votesUp: 4,
          votesDown: 1,
          latitude: 15.3284,
          longitude: 76.4715
        }
      ]
    },
    {
      dayNumber: 3,
      title: "Anegundi & Riverside Exploration",
      activities: [
        {
          id: "act-5",
          time: "09:30 AM",
          title: "Explore Anegundi Village",
          description: "Visit the ancient fortified village older than Hampi itself, nestled amongst green paddy fields.",
          bestPart: "Interacting with local weavers and checking out the local handicraft co-ops.",
          cost: 150,
          category: "culture",
          isMustSee: false,
          votesUp: 2,
          votesDown: 0,
          latitude: 15.3540,
          longitude: 76.4680
        },
        {
          id: "act-6",
          time: "01:00 PM",
          title: "Riverside Picnic Lunch",
          description: "Savor a home-cooked picnic near the ruins along the Tungabhadra River.",
          bestPart: "Surreal boulder landscapes surrounding your peaceful lunch spot.",
          cost: 600,
          category: "food",
          isMustSee: false,
          votesUp: 3,
          votesDown: 0,
          latitude: 15.3485,
          longitude: 76.4635
        }
      ]
    },
    {
      dayNumber: 4,
      title: "Sunset & Departure",
      activities: [
        {
          id: "act-7",
          time: "05:00 AM",
          title: "Matanga Hill Sunrise Hike",
          description: "An early morning trek up the highest point in Hampi for an unparalleled 360-degree view of the ruins in golden hour light.",
          bestPart: "Watching the sun light up the ancient landscape and rivers.",
          cost: 0,
          rating: 4.9,
          category: "nature",
          isMustSee: true,
          votesUp: 5,
          votesDown: 0,
          latitude: 15.3338,
          longitude: 76.4610
        },
        {
          id: "act-8",
          time: "04:30 PM",
          title: "Hemakuta Hill Sunset Farewell",
          description: "Relax on the smooth sloping granite sheets of Hemakuta Hill, watching the sunset over ruins before departure.",
          bestPart: "The serene landscape glowing orange as the day ends.",
          cost: 0,
          rating: 4.8,
          category: "nature",
          isMustSee: true,
          votesUp: 4,
          votesDown: 0,
          latitude: 15.3338,
          longitude: 76.4610
        }
      ]
    }
  ]
};

// Standard response schema for Itinerary Generation
const ITINERARY_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "Dynamic name for the travel plan, e.g. 'Kyoto Cultural Immersion' or 'Goa Coastal Getaway'" },
    durationDays: { type: Type.INTEGER, description: "The number of days for the trip" },
    travelersCount: { type: Type.INTEGER, description: "The number of travelers" },
    estimatedBudget: { type: Type.INTEGER, description: "Suggested overall budget in Indian Rupees (INR)" },
    days: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          dayNumber: { type: Type.INTEGER },
          title: { type: Type.STRING, description: "Focus or highlight of this day" },
          activities: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING, description: "Unique short identifier (e.g., 'act-1')" },
                time: { type: Type.STRING, description: "Time of day (e.g., '09:00 AM')" },
                title: { type: Type.STRING },
                description: { type: Type.STRING, description: "Brief engaging 1-2 sentence description of what to do" },
                bestPart: { type: Type.STRING, description: "1-sentence highlight of why this is awesome or what is the highlight" },
                cost: { type: Type.INTEGER, description: "Approximate cost in Indian Rupees (INR), use 0 if free" },
                rating: { type: Type.NUMBER, description: "A realistic tourist rating out of 5.0 (optional)" },
                category: { 
                  type: Type.STRING, 
                  description: "Categorize the stop",
                  enum: ["culture", "food", "nature", "activity", "general"]
                },
                isMustSee: { type: Type.BOOLEAN, description: "Whether this is a premium must-see landmark" },
                latitude: { type: Type.NUMBER, description: "Approximate real latitude coordinate of this activity/stop, e.g. 35.0116" },
                longitude: { type: Type.NUMBER, description: "Approximate real longitude coordinate of this activity/stop, e.g. 135.7681" }
              },
              required: ["id", "time", "title", "description", "cost", "category", "latitude", "longitude"]
            }
          }
        },
        required: ["dayNumber", "title", "activities"]
      }
    }
  },
  required: ["title", "durationDays", "travelersCount", "estimatedBudget", "days"]
};

// Lazy initialization of Gemini API Client
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!geminiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== "MY_GEMINI_API_KEY" && key.trim() !== "") {
      geminiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          }
        }
      });
    }
  }
  return geminiClient;
}

// Persistent file paths
const USERS_FILE = path.join(process.cwd(), "users.json");
const TRIPS_FILE = path.join(process.cwd(), "trips.json");

// Local DB State Fallbacks
let localUsers: any[] = [];
let localTrips: any[] = [];
let useMongoDb = false;
let tripsCache: any[] = [];

async function refreshTripsCache() {
  if (useMongoDb) {
    try {
      tripsCache = await TripModel.find({}).lean();
    } catch (err) {
      console.error("Error refreshing cache from MongoDB:", err);
    }
  } else {
    tripsCache = localTrips;
  }
}

// Database Abstraction Helpers
async function findUserByEmail(email: string): Promise<any> {
  if (useMongoDb) {
    return await UserModel.findOne({ email: email.toLowerCase() });
  }
  return localUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
}

async function createUser(userData: any): Promise<any> {
  if (useMongoDb) {
    return await UserModel.create(userData);
  }
  localUsers.push(userData);
  fs.writeFileSync(USERS_FILE, JSON.stringify(localUsers, null, 2));
  return userData;
}

async function getTripsFromDb(): Promise<any[]> {
  if (useMongoDb) {
    return await TripModel.find({}).lean();
  }
  return localTrips;
}

async function findTripById(id: string): Promise<any> {
  if (useMongoDb) {
    return await TripModel.findOne({ id }).lean();
  }
  return localTrips.find(t => t.id === id);
}

async function createTripInDb(tripData: any): Promise<any> {
  if (useMongoDb) {
    const result = await TripModel.create(tripData);
    await refreshTripsCache();
    return result;
  }
  localTrips.push(tripData);
  fs.writeFileSync(TRIPS_FILE, JSON.stringify(localTrips, null, 2));
  tripsCache = localTrips;
  return tripData;
}

async function addDocumentToTrip(tripId: string, doc: any): Promise<any> {
  if (useMongoDb) {
    const updated = await TripModel.findOneAndUpdate(
      { id: tripId },
      { $push: { documents: doc } },
      { new: true }
    ).lean();
    await refreshTripsCache();
    return updated;
  }
  const trip = localTrips.find(t => t.id === tripId);
  if (trip) {
    if (!trip.documents) trip.documents = [];
    trip.documents.push(doc);
    fs.writeFileSync(TRIPS_FILE, JSON.stringify(localTrips, null, 2));
    tripsCache = localTrips;
  }
  return trip;
}

async function deleteDocumentFromTrip(tripId: string, docId: string): Promise<any> {
  if (useMongoDb) {
    const updated = await TripModel.findOneAndUpdate(
      { id: tripId },
      { $pull: { documents: { id: docId } } },
      { new: true }
    ).lean();
    await refreshTripsCache();
    return updated;
  }
  const trip = localTrips.find(t => t.id === tripId);
  if (trip) {
    if (!trip.documents) trip.documents = [];
    trip.documents = trip.documents.filter((d: any) => d.id !== docId);
    fs.writeFileSync(TRIPS_FILE, JSON.stringify(localTrips, null, 2));
    tripsCache = localTrips;
  }
  return trip;
}

async function initDB() {
  // Always load JSON files from disk first as standard startup fallback seed
  try {
    if (fs.existsSync(USERS_FILE)) {
      localUsers = JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
    }
    if (fs.existsSync(TRIPS_FILE)) {
      localTrips = JSON.parse(fs.readFileSync(TRIPS_FILE, "utf8"));
    }
  } catch (err) {
    console.error("Error loading local JSON database state:", err);
  }

  // Attempt connection to MongoDB Atlas
  try {
    await connectDB();
    useMongoDb = true;
    
    // Seed database collections from local JSON fallback if they are empty
    const userCount = await UserModel.countDocuments();
    if (userCount === 0 && localUsers.length > 0) {
      console.log("Seeding MongoDB users from local JSON file...");
      await UserModel.insertMany(localUsers);
      console.log("Users seeding completed.");
    }

    const tripCount = await TripModel.countDocuments();
    if (tripCount === 0 && localTrips.length > 0) {
      console.log("Seeding MongoDB trips from local JSON file...");
      await TripModel.insertMany(localTrips);
      console.log("Trips seeding completed.");
    }
    
    await refreshTripsCache();
  } catch (err) {
    console.error("⚠️ falling back to Local JSON database mode due to MongoDB connection issue:", err.message || err);
    useMongoDb = false;
    tripsCache = localTrips;
  }
}

async function startServer() {
  await initDB();
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Global API Rate Limiter
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per `window`
    message: { error: "Too many requests from this IP, please try again after 15 minutes" },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use("/api/", globalLimiter);

  // Specific AI Endpoints Rate Limiter (More strict)
  const aiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 15, // Limit each IP to 15 AI requests per hour
    message: { error: "AI planner rate limit exceeded. Please try again in an hour." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const GenerateItinerarySchema = z.object({
    destination: z.string().min(2).max(100),
    travelers: z.coerce.number().min(1).max(20).default(2),
    duration: z.coerce.number().min(1).max(30).default(4),
    vibe: z.array(z.string()).default(["Heritage"]),
    budget: z.coerce.number().positive().default(50000),
    budgetRange: z.string().default("mid-range"),
    travelStyle: z.string().default("adventure"),
    interests: z.array(z.string()).default([])
  });

  // API Check endpoint
  app.get("/api/health", (req, res) => {
    const hasKey = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY";
    res.json({ status: "ok", geminiConfigured: hasKey, databaseMode: useMongoDb ? "mongodb" : "local-json" });
  });

  // Authentication API 1: Signup
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { email, password, name } = req.body;
      if (!email || !password || !name) {
        return res.status(400).json({ error: "Missing required signup fields." });
      }

      const existingUser = await findUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "Email is already registered." });
      }

      const salt = crypto.randomBytes(16).toString("hex");
      const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");

      const avatar = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`;
      const newUser = await createUser({ email, name, avatar, salt, hash });

      res.json({ success: true, user: { email: newUser.email, name: newUser.name, avatar: newUser.avatar } });
    } catch (err: any) {
      console.error("Signup error:", err);
      res.status(500).json({ error: err.message || "Error occurred during registration." });
    }
  });

  // Authentication API 2: Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required." });
      }

      const user = await findUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password." });
      }

      if (user.salt && user.hash) {
        const hash = crypto.pbkdf2Sync(password, user.salt, 1000, 64, "sha512").toString("hex");
        if (hash !== user.hash) {
          return res.status(401).json({ error: "Invalid email or password." });
        }
      }

      res.json({ success: true, user: { email: user.email, name: user.name, avatar: user.avatar } });
    } catch (err: any) {
      console.error("Login error:", err);
      res.status(500).json({ error: err.message || "Error occurred during login." });
    }
  });

  // Authentication API 3: Google Sign-In Proxy/Mock
  app.post("/api/auth/google-signin", async (req, res) => {
    try {
      const { email, name, avatar } = req.body;
      if (!email || !name) {
        return res.status(400).json({ error: "Google user email and name are required." });
      }

      const defaultAvatar = avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`;
      
      let user = await findUserByEmail(email);
      if (!user) {
        user = await createUser({ 
          email, 
          name, 
          avatar: defaultAvatar, 
          salt: "google-auth", 
          hash: "google-auth-external" 
        });
      }

      res.json({ success: true, user: { email: user.email, name: user.name, avatar: user.avatar } });
    } catch (err: any) {
      console.error("Google login error:", err);
      res.status(500).json({ error: err.message || "Error during Google authentication." });
    }
  });

  // API 1: Generate dynamic travel itinerary with custom AI params (style, budget level, interests)
  app.post("/api/generate-itinerary", aiLimiter, async (req, res) => {
    try {
      const parseResult = GenerateItinerarySchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid request parameters", details: parseResult.error.format() });
      }

      const { 
        destination, 
        travelers, 
        duration, 
        vibe, 
        budget,
        budgetRange,
        travelStyle,
        interests
      } = parseResult.data;

      const client = getGeminiClient();
      if (!client) {
        console.warn("GEMINI_API_KEY is not configured or placeholder. Falling back to structured Hampi itinerary.");
        
        // Return standard premium Hampi itinerary for maximum UI fidelity and consistency with Stitch UI design
        const customHampi = { 
          ...HAMPI_FALLBACK_ITINERARY, 
          id: "hampi-heritage-trail",
          destination: "Hampi",
          tripType: "Heritage",
          createdAt: new Date().toISOString(),
          travelersCount: Number(travelers), 
          durationDays: Number(duration),
          budgetRange,
          travelStyle,
          interests,
          collaborators: [
            { email: "arjun@wanderway.com", name: "Arjun", avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuAsWvNhsNQ6US77s4jK5Cww7lCxGGBh0PXH5e5pRWCugsL91W3xmmtk-oNWPEwW1wL2Fw0jCRkYgP6QG2bZRoU0V2eYDoOm6BxAfK9ggFhf8R6niTFyBKXkxsXxwdYF3iHOJ4uR3gzeDWA4BDMhhFbcfAh2VXhb2Vk5GMTTRc3DMhmR2Z6HOiiE34qVw3xK08zGRMkjPupnxO45mHzO0zJN-l-HnDbOt0yQlwdQSAZMEyGgE3KA9H4nEZHewrsYYB4UaQSnnyS8RW0" },
            { email: "priya@wanderway.com", name: "Priya", avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuAcfS_4_4reic5olAkwrcQgm_gou82PxPpZdhMlzTL09lj4yKltsyGy7b11h3eYvrdZbS_D6WZs3BbQoPldj5rvzLjRPxrSaQ_5_6AIHXkrikkwJG8abivE4fy8_qEqMRnO0rmAf0328IguivSEVTIxXSiIyAiR3N5mqZRHnEClXNls2Ki-Uv0ow2UcsL5w2JgRfQD1QSuExdOUuWMQwbl_dCq_1lCjQbqQrKNGw54fw584KLYyAtflcTeQ2G47Ca0qypaO09uK6Gk" }
          ],
          comments: []
        };
        // Add Hampi Heritage Trail if not exists
        const existingHampi = await findTripById("hampi-heritage-trail");
        if (!existingHampi) {
          await createTripInDb(customHampi);
        }
        return res.json({ itinerary: customHampi, fromCache: true });
      }

      const prompt = `Create a detailed, beautiful, premium, and culturally rich travel itinerary for a trip to: ${destination}.
      Trip Parameters:
      - Travelers: ${travelers} people
      - Duration: ${duration} Days
      - Key Vibe tags: ${vibe.join(", ")}
      - Budget Profile: ${budgetRange} (Target budget limit: ₹${budget} INR)
      - Travel Style: ${travelStyle}
      - Specific Interests: ${interests.join(", ")}

      Provide premium recommendations tailored precisely to the user's travel style (${travelStyle}), budget level (${budgetRange}), and specific interests (${interests.join(", ") || "none specified"}). For example, if travel style is 'adventure' and interest has 'hiking', emphasize active outdoors and hikes. If 'relaxation', focus on slow paces and leisure.
      Ensure you include:
      - Must-see UNESCO or cultural landmarks.
      - Characteristic dining spots matching their interests.
      - Experiential activities or scenic spots matching their travel style.
      
      For every single activity in the itinerary, you MUST generate realistic and accurate GPS coordinates (latitude and longitude numbers) near the destination ${destination} (e.g. if the destination is Kyoto, generate actual Kyoto coordinates like lat 35.0116, lng 135.7681; if Hampi, generate Hampi coordinates like lat 15.3352, lng 76.4623; if Paris, generate Paris coordinates like lat 48.8566, lng 2.3522).
      Generate a realistic timeline with explicit times, realistic costs in INR matching the ${budgetRange} budget range, ratings, and best parts/highlights. Make it high-fidelity, exciting, and structurally logical.`;

      const runGemini = async () => {
        const response = await client.models.generateContent({
          model: "gemini-1.5-flash-8b",
          contents: prompt,
          config: {
            systemInstruction: "You are the premium lead travel planner for WanderWay, an AI-native concierge. You design highly descriptive, realistic, and culturally enriched itineraries with realistic local prices (in Indian Rupees INR) and detailed best-part highlights, including actual real-world geographical coordinates (latitude and longitude) for every activity.",
            responseMimeType: "application/json",
            responseSchema: ITINERARY_RESPONSE_SCHEMA
          }
        });
        
        if (!response.text) {
          throw new Error("Empty response received from Gemini model.");
        }
        return response.text;
      };

      const responseText = await pRetry(runGemini, {
        retries: 3,
        onFailedAttempt: error => {
          console.warn(`Gemini API attempt ${error.attemptNumber} failed. There are ${error.retriesLeft} retries left.`);
        }
      });

      const parsedItinerary = JSON.parse(responseText.trim());
      const tripId = `trip-${Date.now()}`;
      
      parsedItinerary.id = tripId;
      parsedItinerary.destination = destination;
      parsedItinerary.tripType = vibe[0] || "Cultural";
      parsedItinerary.createdAt = new Date().toISOString();
      parsedItinerary.budgetRange = budgetRange;
      parsedItinerary.travelStyle = travelStyle;
      parsedItinerary.interests = interests;
      parsedItinerary.collaborators = [
        { email: "arjun@wanderway.com", name: "Arjun", avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuAsWvNhsNQ6US77s4jK5Cww7lCxGGBh0PXH5e5pRWCugsL91W3xmmtk-oNWPEwW1wL2Fw0jCRkYgP6QG2bZRoU0V2eYDoOm6BxAfK9ggFhf8R6niTFyBKXkxsXxwdYF3iHOJ4uR3gzeDWA4BDMhhFbcfAh2VXhb2Vk5GMTTRc3DMhmR2Z6HOiiE34qVw3xK08zGRMkjPupnxO45mHzO0zJN-l-HnDbOt0yQlwdQSAZMEyGgE3KA9H4nEZHewrsYYB4UaQSnnyS8RW0" }
      ];
      parsedItinerary.comments = [];
      
      // Inject votes fields to support dynamic client side interactive voting
      parsedItinerary.days = parsedItinerary.days.map((day: any) => ({
        ...day,
        activities: day.activities.map((act: any) => ({
          ...act,
          votesUp: act.isMustSee ? Math.floor(Math.random() * 3) + 2 : Math.floor(Math.random() * 2) + 1,
          votesDown: 0,
          userVotes: {}
        }))
      }));

      await createTripInDb(parsedItinerary);

      res.json({ itinerary: parsedItinerary, fromCache: false });
    } catch (error: any) {
      console.error("Error generating itinerary with Gemini API:", error);
      res.json({ 
        itinerary: HAMPI_FALLBACK_ITINERARY, 
        fromCache: true, 
        error: "Our AI planner is currently experiencing high demand. We have provided a premium fallback itinerary for you." 
      });
    }
  });

  // Collaborative Trips API: Get all trips
  app.get("/api/trips", async (req, res) => {
    const trips = await getTripsFromDb();
    res.json({ trips });
  });

  // Collaborative Trips API: Get a specific trip
  app.get("/api/trips/:id", async (req, res) => {
    const trip = await findTripById(req.params.id);
    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }
    res.json({ trip });
  });

  // Documents API 1: Get documents for a trip
  app.get("/api/trips/:id/documents", async (req, res) => {
    const trip = await findTripById(req.params.id);
    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }
    res.json({ documents: trip.documents || [] });
  });

  // Documents API 2: Add a document to a trip
  app.post("/api/trips/:id/documents", async (req, res) => {
    const trip = await findTripById(req.params.id);
    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }
    const { name, category, size, uploadedBy, content } = req.body;
    if (!name || !category || !size || !uploadedBy || !content) {
      return res.status(400).json({ error: "Missing required document fields." });
    }

    const newDoc = {
      id: `doc-${Date.now()}`,
      name,
      category,
      size,
      uploadedBy,
      uploadedAt: new Date().toISOString(),
      content
    };

    const updatedTrip = await addDocumentToTrip(req.params.id, newDoc);

    if (updatedTrip) {
      broadcastToTrip(updatedTrip.id as string, {
        type: "documents_updated",
        tripId: updatedTrip.id,
        documents: updatedTrip.documents
      });
    }

    res.json({ success: true, document: newDoc });
  });

  // Documents API 3: Delete a document from a trip
  app.delete("/api/trips/:id/documents/:docId", async (req, res) => {
    const docId = req.params.docId;
    const updatedTrip = await deleteDocumentFromTrip(req.params.id, docId);

    if (!updatedTrip) {
      return res.status(404).json({ error: "Trip not found" });
    }

    broadcastToTrip(updatedTrip.id as string, {
      type: "documents_updated",
      tripId: updatedTrip.id,
      documents: updatedTrip.documents
    });

    res.json({ success: true });
  });

  const ChatSchema = z.object({
    messages: z.array(z.object({
      sender: z.enum(["user", "ai"]),
      content: z.string().min(1)
    })),
    currentItineraryTitle: z.string().optional()
  });

  // API 2: Chat Mode AI Assistant chat
  app.post("/api/chat", aiLimiter, async (req, res) => {
    try {
      const parseResult = ChatSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid request parameters" });
      }
      const { messages, currentItineraryTitle } = parseResult.data;
      const client = getGeminiClient();
      
      if (!client) {
        const lastMessage = messages[messages.length - 1]?.content || "";
        let mockReply = "I'm in offline sandbox mode right now! Here's what we can look at next: stay options or exploring the local cuisine around Hampi!";
        if (lastMessage.toLowerCase().includes("budget")) {
          mockReply = "An estimated budget of ₹50,000 for 2 people is great for a premium Hampi trip! It easily covers luxury stays, private guides, standard entry fees, coracle rides, and wonderful thalis at Mango Tree.";
        } else if (lastMessage.toLowerCase().includes("stay") || lastMessage.toLowerCase().includes("hotel")) {
          mockReply = "For premium stays in Hampi, I recommend looking at Heritage Resort Hampi or Evolve Back Kamalapura Palace for an immersive luxury experience, or cute riverside guest houses on Sanapur island for a nature vibe.";
        }
        return res.json({ reply: mockReply });
      }

      const systemPrompt = `You are the premium, highly intelligent travel concierge for WanderWay. 
      The user is currently planning or viewing a trip named "${currentItineraryTitle || "Hampi Heritage Trail"}".
      Be concise, warm, helpful, structured, and avoid generic AI buzzwords or filler lines. 
      Use direct, clear recommendations with local context. Do not offer unrequested summaries. Keep your answer highly tailored to the user's specific question.`;

      // Convert messages to Gemini format
      const formattedContents = messages.map((m: any) => ({
        role: m.sender === "user" ? "user" : "model",
        parts: [{ text: m.content }]
      }));

      const runGeminiChat = async () => {
        const response = await client.models.generateContent({
          model: "gemini-1.5-flash-8b",
          contents: formattedContents,
          config: {
            systemInstruction: systemPrompt,
          }
        });
        return response.text || "I apologize, I couldn't form a response.";
      };

      const replyText = await pRetry(runGeminiChat, { retries: 2 });
      res.json({ reply: replyText });
    } catch (error: any) {
      console.error("Error in WanderWay Chat:", error);
      res.status(500).json({ error: "The travel planner assistant is temporarily unavailable. Please try again later." });
    }
  });

  const PackingSchema = z.object({
    destination: z.string().min(2),
    weather: z.string().optional(),
    activityTypes: z.array(z.string()).optional(),
    existingItemNames: z.array(z.string()).optional()
  });

  // API 3: AI Packing List Suggestions
  app.post("/api/packing/suggest", aiLimiter, async (req, res) => {
    try {
      const parseResult = PackingSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid request parameters" });
      }
      const { destination, weather, activityTypes, existingItemNames } = parseResult.data;
      const client = getGeminiClient();

      if (!client) {
        // High-quality fallback when Gemini API key is missing
        const isIntl = !destination.toLowerCase().includes("hampi") && 
                       !destination.toLowerCase().includes("india") && 
                       !destination.toLowerCase().includes("goa") && 
                       !destination.toLowerCase().includes("karnataka");
        
        let suggestions = [
          { name: "High-Capacity Power Bank", category: "Activity-Specific", description: "Essential for keeping devices charged during long temple visits and hiking trails." },
          { name: "Broad-Spectrum SPF 50 Sunscreen", category: "Essentials & Toiletries", description: "Crucial for protection against high-UV indices during daytime outdoor activities." },
          { name: "Microfiber Quick-Dry Towel", category: "Essentials & Toiletries", description: "Lightweight, space-saving, and dry-fast towel for water sports and active hiking." },
          { name: "Universal Travel Plug Adapter", category: "Activity-Specific", description: isIntl ? "Required for international outlet configurations to charge laptops and phones." : "Useful for connecting multiple devices on native boards." },
          { name: "Comfortable Breathable Walking Shoes", category: "Clothing", description: "Ensures ergonomic foot support when navigating ruins, rocky terrain, or walking trails." },
          { name: "Emergency First-Aid Kit", category: "Essentials & Toiletries", description: "Basic antiseptic wipes, band-aids, and personal medication for trail safety." }
        ];

        // Filter out items already existing
        if (existingItemNames && Array.isArray(existingItemNames)) {
          suggestions = suggestions.filter((s: any) => !existingItemNames.some((e: string) => e.toLowerCase() === s.name.toLowerCase()));
        }

        return res.json({ suggestions });
      }

      const prompt = `Recommend a list of 5 to 7 highly specific, crucial, but currently missing packing items for a trip to "${destination}".
      
      Trip context:
      - Weather forecast: ${weather || "Not specified"}
      - Planned activities types: ${JSON.stringify(activityTypes || [])}
      - Already packed/listed item names: ${JSON.stringify(existingItemNames || [])}
      
      Instructions:
      - Recommend strictly ONLY items that are NOT already listed in already packed/listed item names.
      - The suggestions must be highly customized for this specific destination, weather, and activities.
      - Each item must belong to exactly one of these categories: "Clothing", "Essentials & Toiletries", "Documents", or "Activity-Specific".
      - Keep description concise (under 12 words) justifying why it's recommended.`;

      const runGeminiPacking = async () => {
        const response = await client.models.generateContent({
          model: "gemini-1.5-flash-8b",
          contents: prompt,
          config: {
            systemInstruction: "You are the smart packing concierge for WanderWay, an AI-native concierge. You design highly accurate packing lists based on weather and trip activities.",
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                suggestions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      category: { type: Type.STRING, enum: ["Clothing", "Essentials & Toiletries", "Documents", "Activity-Specific"] },
                      description: { type: Type.STRING }
                    },
                    required: ["name", "category", "description"]
                  }
                }
              },
              required: ["suggestions"]
            }
          }
        });
        if (!response.text) throw new Error("Empty response from model");
        return response.text;
      };

      const responseText = await pRetry(runGeminiPacking, { retries: 2 });
      const parsed = JSON.parse(responseText.trim());
      res.json({ suggestions: parsed.suggestions || [] });
    } catch (err: any) {
      console.error("AI Packing suggestions error:", err);
      res.status(500).json({ error: "Failed to generate packing list suggestions due to high demand. Please try again." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Create HTTP Server & WebSocket Server
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });

  // Map to store client properties
  const clientsMap = new Map<WebSocket, { tripId: string; user: any }>();

  wss.on("connection", (ws) => {
    ws.on("message", async (messageData) => {
      try {
        const message = JSON.parse(messageData.toString());

        if (message.type === "join") {
          clientsMap.set(ws, { tripId: message.tripId, user: message.user });
          ws.send(JSON.stringify({ type: "joined", tripId: message.tripId }));
          
          // Send active presence lists to everyone in the trip
          broadcastPresence(message.tripId);
        } else if (message.type === "vote") {
          const { tripId, dayNumber, activityId, voteType, email } = message;
          const trip = tripsCache.find(t => t.id === tripId);
          if (trip) {
            const day = trip.days.find((d: any) => d.dayNumber === dayNumber);
            if (day) {
              const activity = day.activities.find((a: any) => a.id === activityId);
              if (activity) {
                if (activity.votesUp === undefined) activity.votesUp = 0;
                if (activity.votesDown === undefined) activity.votesDown = 0;
                if (!activity.userVotes) activity.userVotes = {};

                const previousVote = activity.userVotes[email];
                if (previousVote === voteType) {
                  delete activity.userVotes[email];
                  if (voteType === "up") activity.votesUp = Math.max(0, activity.votesUp - 1);
                  if (voteType === "down") activity.votesDown = Math.max(0, activity.votesDown - 1);
                } else {
                  if (previousVote === "up") activity.votesUp = Math.max(0, activity.votesUp - 1);
                  if (previousVote === "down") activity.votesDown = Math.max(0, activity.votesDown - 1);

                  activity.userVotes[email] = voteType;
                  if (voteType === "up") activity.votesUp++;
                  if (voteType === "down") activity.votesDown++;
                }

                // Update DB in background
                if (useMongoDb) {
                  TripModel.updateOne(
                    { id: tripId },
                    { 
                      $set: { 
                        "days.$[day].activities.$[act].votesUp": activity.votesUp,
                        "days.$[day].activities.$[act].votesDown": activity.votesDown,
                        "days.$[day].activities.$[act].userVotes": activity.userVotes
                      } 
                    },
                    { arrayFilters: [{ "day.dayNumber": dayNumber }, { "act.id": activityId }] }
                  ).exec().catch(err => console.error("Error updating vote in DB:", err));
                } else {
                  fs.writeFileSync(TRIPS_FILE, JSON.stringify(localTrips, null, 2));
                }
                
                broadcastToTrip(tripId, {
                  type: "vote_updated",
                  tripId,
                  dayNumber,
                  activityId,
                  votesUp: activity.votesUp,
                  votesDown: activity.votesDown,
                  userVotes: activity.userVotes
                });
              }
            }
          }
        } else if (message.type === "comment") {
          const { tripId, comment } = message;
          const trip = tripsCache.find(t => t.id === tripId);
          if (trip) {
            const newComment = {
              id: `comment-${Date.now()}`,
              author: comment.author,
              avatar: comment.avatar,
              content: comment.content,
              timestamp: "Just now"
            };
            if (!trip.comments) trip.comments = [];
            trip.comments.push(newComment);
            
            if (useMongoDb) {
              TripModel.updateOne(
                { id: tripId },
                { $push: { comments: newComment } }
              ).exec().catch(err => console.error("Error adding comment to DB:", err));
            } else {
              fs.writeFileSync(TRIPS_FILE, JSON.stringify(localTrips, null, 2));
            }

            broadcastToTrip(tripId, {
              type: "comment_added",
              tripId,
              comment: newComment
            });
          }
        } else if (message.type === "invite") {
          const { tripId, email } = message;
          const trip = tripsCache.find(t => t.id === tripId);
          if (trip) {
            const existingUser = await findUserByEmail(email);
            const collaboratorName = existingUser ? existingUser.name : email.split("@")[0];
            const collaboratorAvatar = existingUser ? existingUser.avatar : `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(collaboratorName)}`;
            
            const newCollab = {
              email,
              name: collaboratorName,
              avatar: collaboratorAvatar,
              joinedAt: new Date().toISOString()
            };

            if (!trip.collaborators) trip.collaborators = [];
            if (!trip.collaborators.some((c: any) => c.email.toLowerCase() === email.toLowerCase())) {
              trip.collaborators.push(newCollab);
              
              if (useMongoDb) {
                TripModel.updateOne(
                  { id: tripId },
                  { $push: { collaborators: newCollab } }
                ).exec().catch(err => console.error("Error adding collaborator to DB:", err));
              } else {
                fs.writeFileSync(TRIPS_FILE, JSON.stringify(localTrips, null, 2));
              }
              broadcastToTrip(tripId, {
                type: "collaborator_invited",
                tripId,
                collaborator: newCollab
              });
            }
          }
        }
      } catch (err) {
        console.error("WS processing error:", err);
      }
    });

    ws.on("close", () => {
      const info = clientsMap.get(ws);
      if (info) {
        clientsMap.delete(ws);
        broadcastPresence(info.tripId);
      }
    });
  });

  function broadcastPresence(tripId: string) {
    const activeUsers: any[] = [];
    clientsMap.forEach((info) => {
      if (info.tripId === tripId && info.user) {
        // Prevent duplicate presence items in same session list
        if (!activeUsers.some(u => u.email === info.user.email)) {
          activeUsers.push(info.user);
        }
      }
    });
    broadcastToTrip(tripId, {
      type: "presence",
      tripId,
      users: activeUsers
    });
  }

  function broadcastToTrip(tripId: string, payload: any) {
    const serialized = JSON.stringify(payload);
    clientsMap.forEach((info, clientWs) => {
      if (info.tripId === tripId && clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(serialized);
      }
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`WanderWay Multi-User server running on http://localhost:${PORT}`);
  });
}

startServer();
