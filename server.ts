import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { randomUUID } from "node:crypto";
import fs from "fs";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import pRetry from "p-retry";
import { getAuth } from "./server/lib/firebaseAdmin.js";

import helmet from "helmet";
import "express-async-errors";
import { requireAuth } from "./server/middleware/requireAuth.js";

import { connectDB } from "./db/connection";
import { UserModel } from "./db/models/User";
import { TripModel } from "./db/models/Trip";

dotenv.config({ path: ".env.local" });

const GEMINI_TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || "gemini-3-flash-preview";
const GEMINI_FALLBACK_MODELS = Array.from(
  new Set([GEMINI_TEXT_MODEL, "gemini-flash-latest", "gemini-2.0-flash"])
);
const GEMINI_REQUEST_TIMEOUT_MS = Number(process.env.GEMINI_REQUEST_TIMEOUT_MS || 45000);

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
      })
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function generateGeminiContent(client: GoogleGenAI, request: any) {
  let lastError: unknown;

  for (const model of GEMINI_FALLBACK_MODELS) {
    try {
      return await withTimeout(
        client.models.generateContent({ ...request, model }),
        GEMINI_REQUEST_TIMEOUT_MS,
        `Gemini model ${model} timed out after ${GEMINI_REQUEST_TIMEOUT_MS}ms.`
      );
    } catch (error: any) {
      lastError = error;
      console.warn(`Gemini model ${model} failed:`, error?.message || error);
    }
  }

  throw lastError || new Error("All Gemini model attempts failed.");
}

// Standard response schema for Itinerary Generation
const ITINERARY_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "Dynamic name for the travel plan, e.g. 'Kyoto Cultural Immersion' or 'Goa Coastal Getaway'" },
    originLocation: { type: Type.STRING, description: "Starting city, home base, or user coordinates for route planning if provided" },
    destination: { type: Type.STRING, description: "Destination city, region, or country for the trip" },
    tripType: { type: Type.STRING, description: "Primary trip vibe such as Heritage, Beach, Adventure, Foodie, or Nature" },
    durationDays: { type: Type.INTEGER, description: "The number of days for the trip" },
    travelersCount: { type: Type.INTEGER, description: "The number of travelers" },
    estimatedBudget: { type: Type.INTEGER, description: "Suggested overall budget in Indian Rupees (INR)" },
    budgetRange: { type: Type.STRING, description: "Budget profile such as budget, mid-range, or luxury" },
    travelStyle: { type: Type.STRING, description: "Travel style such as adventure, relaxation, or cultural" },
    travelMode: { type: Type.STRING, description: "Preferred travel mode such as flight, train, car, public-transit, walking, bike, or mixed" },
    interests: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Specific user interests reflected in the itinerary" },
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
    },
    packingList: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "Name of the item to pack" },
          category: { type: Type.STRING, enum: ["Clothing", "Essentials", "Activity-Specific", "Other"] },
          reason: { type: Type.STRING, description: "Why this item is needed for this specific trip based on climate/vibe" }
        },
        required: ["name", "category", "reason"]
      }
    },
    documentsList: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "Name of the document required" },
          reason: { type: Type.STRING, description: "Why this document is needed" }
        },
        required: ["name", "reason"]
      }
    }
  },
  required: ["title", "durationDays", "travelersCount", "estimatedBudget", "days", "packingList", "documentsList"]
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
const UPLOADS_DIR = path.join(process.cwd(), "server", "uploads");

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

async function updateTripInDb(tripId: string, tripData: any): Promise<any> {
  if (useMongoDb) {
    const updated = await TripModel.findOneAndUpdate(
      { id: tripId },
      { $set: tripData },
      { new: true, runValidators: true }
    ).lean();
    await refreshTripsCache();
    return updated;
  }

  const index = localTrips.findIndex(t => t.id === tripId);
  if (index === -1) return null;
  localTrips[index] = { ...localTrips[index], ...tripData, id: tripId };
  fs.writeFileSync(TRIPS_FILE, JSON.stringify(localTrips, null, 2));
  tripsCache = localTrips;
  return localTrips[index];
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

function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

function isCollaborator(trip: any, email?: string | null): boolean {
  if (!trip || !email) return false;
  return trip.collaborators?.some((c: any) => c.email?.toLowerCase() === email.toLowerCase());
}

function reqUserEmail(user: any): string {
  return user?.email || "traveler@wanderway.local";
}

function collaboratorFromUser(user: any) {
  const email = reqUserEmail(user);
  return {
    email,
    name: user?.name || email.split("@")[0] || "Traveler",
    avatar: user?.picture || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(email)}`,
    joinedAt: new Date().toISOString()
  };
}

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});

async function startServer() {
  await initDB();
  ensureUploadsDir();
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.set("trust proxy", 1);
  const cspDirectives = {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "https://unpkg.com", "https://apis.google.com", "https://www.gstatic.com", "https://*.firebaseapp.com"],
    scriptSrcElem: ["'self'", "https://unpkg.com", "https://apis.google.com", "https://www.gstatic.com", "https://*.firebaseapp.com"],
    frameSrc: ["'self'", "https://*.firebaseapp.com", "https://apis.google.com"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://fonts.googleapis.com"],
    fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
    imgSrc: ["'self'", "data:", "blob:", "https://*.tile.openstreetmap.org", "https://lh3.googleusercontent.com"],
    connectSrc: [
      "'self'",
      "https://securetoken.googleapis.com",
      "https://identitytoolkit.googleapis.com",
      "https://www.googleapis.com",
      "https://unpkg.com",
      "https://api.open-meteo.com",
      "https://geocoding-api.open-meteo.com",
      "https://open.er-api.com",
      "ws:",
      "wss:",
    ],
  };

  app.use(
    helmet({
      contentSecurityPolicy:
        process.env.NODE_ENV !== "production"
          ? {
              directives: {
                ...cspDirectives,
                scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://apis.google.com", "https://www.gstatic.com", "https://*.firebaseapp.com"],
                scriptSrcElem: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://apis.google.com", "https://www.gstatic.com", "https://*.firebaseapp.com"],
                connectSrc: [
                  ...cspDirectives.connectSrc,
                  "http://localhost:*",
                  "http://127.0.0.1:*",
                ],
              },
            }
          : {
              directives: cspDirectives,
            },
    })
  );

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
    originLocation: z.string().min(2).max(140),
    travelers: z.coerce.number().min(1).max(20).default(2),
    duration: z.coerce.number().min(1).max(30).default(4),
    vibe: z.array(z.string()).default(["Heritage"]),
    budget: z.coerce.number().positive().default(50000),
    budgetRange: z.string().default("mid-range"),
    travelStyle: z.string().default("adventure"),
    travelMode: z.string().default("mixed"),
    interests: z.array(z.string()).default([])
  });

  const ChatItinerarySchema = z.object({
    messages: z.array(z.object({
      sender: z.enum(["user", "ai"]),
      content: z.string().min(1)
    })),
    defaults: GenerateItinerarySchema.partial().optional()
  });

  const RefineItinerarySchema = z.object({
    instruction: z.string().min(2).max(1000),
    itinerary: z.any()
  });

  const attachTripMetadata = (itinerary: any, metadata: any) => {
    itinerary.id = metadata.id || `trip-${randomUUID()}`;
    itinerary.originLocation = metadata.originLocation || itinerary.originLocation || "";
    itinerary.destination = metadata.destination || itinerary.destination || "Custom Trip";
    itinerary.tripType = metadata.tripType || itinerary.tripType || "Custom";
    itinerary.createdAt = metadata.createdAt || new Date().toISOString();
    itinerary.budgetRange = metadata.budgetRange || itinerary.budgetRange || "mid-range";
    itinerary.travelStyle = metadata.travelStyle || itinerary.travelStyle || "adventure";
    itinerary.travelMode = metadata.travelMode || itinerary.travelMode || "mixed";
    itinerary.interests = metadata.interests || itinerary.interests || [];
    itinerary.collaborators = metadata.collaborators || [collaboratorFromUser(metadata.user)];
    itinerary.comments = metadata.comments || itinerary.comments || [];
    itinerary.documents = metadata.documents || itinerary.documents || [];
    itinerary.days = (itinerary.days || []).map((day: any) => ({
      ...day,
      activities: (day.activities || []).map((act: any, index: number) => ({
        ...act,
        id: act.id || `act-${day.dayNumber || 1}-${index + 1}`,
        bestPart: act.bestPart || "A memorable highlight of this stop.",
        isMustSee: Boolean(act.isMustSee),
        votesUp: Number.isFinite(act.votesUp) ? act.votesUp : (act.isMustSee ? 2 : 1),
        votesDown: Number.isFinite(act.votesDown) ? act.votesDown : 0,
        userVotes: act.userVotes || {}
      }))
    }));
    return itinerary;
  };

  // API Check endpoint
  app.get("/api/health", (req, res) => {
    const hasKey = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY";
    res.json({ status: "ok", geminiConfigured: hasKey, databaseMode: useMongoDb ? "mongodb" : "local-json" });
  });


  // API 1: Generate dynamic travel itinerary with custom AI params (style, budget level, interests)
  app.post("/api/generate-itinerary", requireAuth, aiLimiter, async (req, res) => {
    try {
      const parseResult = GenerateItinerarySchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid request parameters", details: parseResult.error.format() });
      }

      const {
        destination,
        originLocation,
        travelers,
        duration,
        vibe,
        budget,
        budgetRange,
        travelStyle,
        travelMode,
        interests
      } = parseResult.data;

      const client = getGeminiClient();
      if (!client) {
        return res.status(503).json({
          error: {
            code: "AI_NOT_CONFIGURED",
            message: "Trip generation is unavailable because Gemini is not configured."
          }
        });
      }

      const routeContext = `The traveler is starting from: ${originLocation}. The itinerary must begin with the travel leg from ${originLocation} to ${destination}, including practical arrival/departure suggestions, timing assumptions, and transport guidance.`;

      const prompt = `Create a detailed, beautiful, premium, and culturally rich travel itinerary for a trip to: ${destination}.
      Trip Parameters:
      - Starting From: ${originLocation}
      - Travelers: ${travelers} people
      - Duration: ${duration} Days
      - Key Vibe tags: ${vibe.join(", ")}
      - Budget Profile: ${budgetRange} (Target budget limit: ₹${budget} INR)
      - Travel Style: ${travelStyle}
      - Preferred Travel Mode: ${travelMode}
      - Specific Interests: ${interests.join(", ")}

      Route Context:
      ${routeContext}

      Provide premium recommendations tailored precisely to the user's travel style (${travelStyle}), preferred travel mode (${travelMode}), budget level (${budgetRange}), and specific interests (${interests.join(", ") || "none specified"}). For example, if travel style is 'adventure' and interest has 'hiking', emphasize active outdoors and hikes. If 'relaxation', focus on slow paces and leisure.
      Ensure you include:
      - Must-see UNESCO or cultural landmarks.
      - Characteristic dining spots matching their interests.
      - Experiential activities or scenic spots matching their travel style.
      
      For every single activity in the itinerary, you MUST generate realistic and accurate GPS coordinates (latitude and longitude numbers) near the destination ${destination} (e.g. if the destination is Kyoto, generate actual Kyoto coordinates like lat 35.0116, lng 135.7681; if Paris, generate Paris coordinates like lat 48.8566, lng 2.3522).
      Generate a realistic timeline with explicit times, realistic costs in INR matching the ${budgetRange} budget range, ratings, and best parts/highlights. Day 1 must start from the user's origin and move toward the destination before local activities. Make it high-fidelity, exciting, and structurally logical.
      Additionally, dynamically generate a contextual packing list (packingList) and list of required documents (documentsList) based on the specific destination, climate, environment, and selected vibe/theme.`;

      const runGemini = async () => {
        const response = await generateGeminiContent(client, {
          contents: prompt,
          config: {
            systemInstruction: "You are the premium lead travel planner for WanderWay, an AI-native concierge. Every itinerary must start from the user's provided origin location, include the route into the destination, and then continue into local activities. You design highly descriptive, realistic, and culturally enriched itineraries with realistic local prices (in Indian Rupees INR) and detailed best-part highlights, including actual real-world geographical coordinates (latitude and longitude) for every activity.",
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
      const tripId = `trip-${randomUUID()}`;

      parsedItinerary.id = tripId;
      parsedItinerary.originLocation = originLocation;
      parsedItinerary.destination = destination;
      parsedItinerary.tripType = vibe[0] || "Cultural";
      parsedItinerary.createdAt = new Date().toISOString();
      parsedItinerary.budgetRange = budgetRange;
      parsedItinerary.travelStyle = travelStyle;
      parsedItinerary.travelMode = travelMode;
      parsedItinerary.interests = interests;
      parsedItinerary.collaborators = [
        collaboratorFromUser(req.user)
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
      res.status(502).json({
        error: {
          code: "AI_GENERATION_FAILED",
          message: "Unable to generate itinerary at the moment. Please retry shortly."
        }
      });
    }
  });

  app.post("/api/generate-itinerary-from-chat", requireAuth, aiLimiter, async (req, res) => {
    try {
      const parseResult = ChatItinerarySchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid request parameters", details: parseResult.error.format() });
      }

      const { messages, defaults = {} } = parseResult.data;
      const conversation = messages.map(m => `${m.sender === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n");
      const chatMentionsOrigin = /\b(from|starting from|leaving from|departing from|travel(?:ing|ling) from|i am in|i'm in)\b/i.test(conversation);
      if (!defaults.originLocation && !chatMentionsOrigin) {
        return res.status(400).json({
          error: {
            code: "ORIGIN_REQUIRED",
            message: "A starting location is required so the plan can begin from where the user is travelling."
          }
        });
      }

      const client = getGeminiClient();
      if (!client) {
        return res.status(503).json({
          error: {
            code: "AI_NOT_CONFIGURED",
            message: "Trip generation is unavailable because Gemini is not configured."
          }
        });
      }

      const prompt = `Create a complete WanderWay itinerary from this planning chat.

      Conversation:
      ${conversation}

      Defaults to use only when the chat does not specify a value:
      - Destination: ${defaults.destination || "infer the destination from the chat"}
      - Starting From: ${defaults.originLocation || "infer from chat if the user mentions where they are leaving from"}
      - Travelers: ${defaults.travelers || 2}
      - Duration: ${defaults.duration || 4} days
      - Vibes: ${(defaults.vibe || ["Heritage"]).join(", ")}
      - Budget Range: ${defaults.budgetRange || "mid-range"}
      - Budget Limit: INR ${defaults.budget || 50000}
      - Travel Style: ${defaults.travelStyle || "adventure"}
      - Preferred Travel Mode: ${defaults.travelMode || "mixed"}
      - Interests: ${(defaults.interests || []).join(", ") || "infer from chat"}

      Build a useful day-by-day itinerary that obeys the user's newest request. The plan must begin from the starting location, include practical from-to travel assumptions from that origin to the destination on Day 1, and include return/departure guidance on the final day. Include realistic coordinates for every activity. Also dynamically generate packingList and documentsList relevant to the trip context.`;

      const runGemini = async () => {
        const response = await generateGeminiContent(client, {
          contents: prompt,
          config: {
            systemInstruction: "You turn natural-language travel planning chats into complete, realistic WanderWay itinerary JSON. Every itinerary must start from the user's origin location and then continue into destination activities. Prefer the user's newest explicit request over defaults.",
            responseMimeType: "application/json",
            responseSchema: ITINERARY_RESPONSE_SCHEMA
          }
        });

        if (!response.text) throw new Error("Empty response received from Gemini model.");
        return response.text;
      };

      const responseText = await pRetry(runGemini, { retries: 2 });
      const parsedItinerary = JSON.parse(responseText.trim());
      const normalized = attachTripMetadata(parsedItinerary, {
        user: req.user,
        originLocation: parsedItinerary.originLocation || defaults.originLocation,
        destination: parsedItinerary.destination || defaults.destination,
        tripType: defaults.vibe?.[0] || parsedItinerary.tripType || "Custom",
        budgetRange: defaults.budgetRange,
        travelStyle: defaults.travelStyle,
        travelMode: defaults.travelMode,
        interests: defaults.interests
      });

      await createTripInDb(normalized);
      res.json({
        reply: `Created "${normalized.title}" and opened it as your active itinerary.`,
        itinerary: normalized,
        fromCache: false
      });
    } catch (error: any) {
      console.error("Error generating chat itinerary:", error);
      res.status(502).json({
        error: {
          code: "AI_CHAT_ITINERARY_FAILED",
          message: "Unable to turn this chat into an itinerary right now. Please retry shortly."
        }
      });
    }
  });

  app.post("/api/trips/:id/refine-itinerary", requireAuth, aiLimiter, async (req, res) => {
    try {
      const parseResult = RefineItinerarySchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid request parameters", details: parseResult.error.format() });
      }

      const existingTrip = await findTripById(req.params.id);
      if (!existingTrip) return res.status(404).json({ error: "Trip not found" });
      if (!isCollaborator(existingTrip, req.user?.email)) {
        return res.status(403).json({ error: "Not a collaborator on this trip." });
      }

      const client = getGeminiClient();
      if (!client) {
        return res.status(503).json({
          error: {
            code: "AI_NOT_CONFIGURED",
            message: "Trip editing is unavailable because Gemini is not configured."
          }
        });
      }

      const { instruction, itinerary } = parseResult.data;
      const prompt = `Update this WanderWay itinerary according to the user's instruction.

      User instruction:
      ${instruction}

      Current itinerary JSON:
      ${JSON.stringify(itinerary)}

      Return the full updated itinerary JSON, not a patch. Preserve good existing activities unless the instruction asks to change them. If the user changes origin, destination, budget, style, or preferred travel mode, reflect those fields in the returned JSON. Keep realistic coordinates for every activity.`;

      const runGemini = async () => {
        const response = await generateGeminiContent(client, {
          contents: prompt,
          config: {
            systemInstruction: "You edit travel itineraries. Return complete valid WanderWay itinerary JSON that reflects the user's requested change.",
            responseMimeType: "application/json",
            responseSchema: ITINERARY_RESPONSE_SCHEMA
          }
        });

        if (!response.text) throw new Error("Empty response received from Gemini model.");
        return response.text;
      };

      const responseText = await pRetry(runGemini, { retries: 2 });
      const parsedItinerary = JSON.parse(responseText.trim());
      const normalized = attachTripMetadata(parsedItinerary, {
        id: existingTrip.id,
        user: req.user,
        originLocation: parsedItinerary.originLocation || existingTrip.originLocation,
        destination: parsedItinerary.destination || existingTrip.destination,
        tripType: parsedItinerary.tripType || existingTrip.tripType,
        createdAt: existingTrip.createdAt,
        budgetRange: parsedItinerary.budgetRange || existingTrip.budgetRange,
        travelStyle: parsedItinerary.travelStyle || existingTrip.travelStyle,
        travelMode: parsedItinerary.travelMode || existingTrip.travelMode,
        interests: parsedItinerary.interests || existingTrip.interests,
        collaborators: existingTrip.collaborators,
        comments: existingTrip.comments,
        documents: existingTrip.documents
      });

      const updatedTrip = await updateTripInDb(existingTrip.id, normalized);
      broadcastToTrip(existingTrip.id, {
        type: "itinerary_updated",
        tripId: existingTrip.id,
        itinerary: updatedTrip
      });

      res.json({
        reply: `Updated "${updatedTrip.title}" and synced the itinerary across pages.`,
        itinerary: updatedTrip
      });
    } catch (error: any) {
      console.error("Error refining itinerary:", error);
      res.status(502).json({
        error: {
          code: "AI_ITINERARY_REFINE_FAILED",
          message: "Unable to update the itinerary right now. Please retry shortly."
        }
      });
    }
  });

  // Collaborative Trips API: Get all trips
  app.get("/api/trips", requireAuth, async (req, res) => {
    const allTrips = await getTripsFromDb();
    const userEmail = reqUserEmail(req.user).toLowerCase();
    const currentCollaborator = collaboratorFromUser(req.user);
    const userTrips = allTrips.filter((t: any) =>
      t.collaborators?.some((c: any) => c.email?.toLowerCase() === userEmail)
    );

    const trips = [...userTrips]
      .slice(0, 50)
      .map((t: any) => ({ ...t, documents: t.documents?.map((d: any) => ({ ...d, content: undefined })) }));
    res.json({ trips });
  });

  // Collaborative Trips API: Get a specific trip
  app.get("/api/trips/:id", requireAuth, async (req, res) => {
    const trip = await findTripById(req.params.id);
    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }
    const isCollab = trip.collaborators?.some((c: any) => c.email === req.user?.email);
    if (!isCollab) return res.status(403).json({ error: "Not a collaborator on this trip." });
    res.json({ trip });
  });

  // Documents API 1: Get documents for a trip
  app.get("/api/trips/:id/documents", requireAuth, async (req, res) => {
    const trip = await findTripById(req.params.id);
    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }
    const isCollab = trip.collaborators?.some((c: any) => c.email === req.user?.email);
    if (!isCollab) return res.status(403).json({ error: "Not a collaborator on this trip." });
    res.json({ documents: trip.documents || [] });
  });

  // Documents API 2: Add a document to a trip
  app.post("/api/trips/:id/documents", requireAuth, async (req, res) => {
    const trip = await findTripById(req.params.id);
    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }
    const isCollab = trip.collaborators?.some((c: any) => c.email === req.user?.email);
    if (!isCollab) return res.status(403).json({ error: "Not a collaborator on this trip." });

    const { name, category, size, uploadedBy, content } = req.body;
    if (!name || !category || size === undefined || !uploadedBy || !content) {
      return res.status(400).json({ error: "Missing required document fields." });
    }

    const encoded = String(content).split(",").pop() || "";
    const binary = Buffer.from(encoded, "base64");
    const extension = path.extname(String(name)) || ".bin";
    const storageKey = `${randomUUID()}${extension.toLowerCase()}`;
    const targetPath = path.join(UPLOADS_DIR, storageKey);
    await fs.promises.writeFile(targetPath, binary);

    const newDoc = {
      id: `doc-${randomUUID()}`,
      name,
      category,
      size: Number(size),
      uploadedBy,
      uploadedAt: new Date().toISOString(),
      storageKey,
      content: undefined
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

  app.get("/api/documents/:storageKey", requireAuth, async (req, res) => {
    const key = req.params.storageKey;
    const userEmail = req.user?.email;
    const trip = tripsCache.find((t: any) => t.documents?.some((d: any) => d.storageKey === key));

    if (!trip || !isCollaborator(trip, userEmail)) {
      return res.status(404).json({ error: "Document not found" });
    }

    const absolutePath = path.join(UPLOADS_DIR, key);
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ error: "Document file missing" });
    }

    return res.sendFile(absolutePath);
  });

  // Documents API 3: Delete a document from a trip
  app.delete("/api/trips/:id/documents/:docId", requireAuth, async (req, res) => {
    const trip = await findTripById(req.params.id);
    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }
    const isCollab = trip.collaborators?.some((c: any) => c.email === req.user?.email);
    if (!isCollab) return res.status(403).json({ error: "Not a collaborator on this trip." });

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
        let mockReply = "I'm in offline sandbox mode right now. I can still help with route ideas, stays, and food planning for your destination.";
        if (lastMessage.toLowerCase().includes("budget")) {
          mockReply = "A clear per-day budget split works well. Share your total budget and trip length, and I will optimize it by stays, food, and transport.";
        } else if (lastMessage.toLowerCase().includes("stay") || lastMessage.toLowerCase().includes("hotel")) {
          mockReply = "I recommend choosing one base area, then narrowing to 2 to 3 highly rated hotels near your priority activities.";
        }
        return res.json({ reply: mockReply });
      }

      const systemPrompt = `You are the premium, highly intelligent travel concierge for WanderWay. 
      The user is currently planning or viewing a trip named "${currentItineraryTitle || "WanderWay Trip"}".
      Be concise, warm, helpful, structured, and avoid generic AI buzzwords or filler lines. 
      Use direct, clear recommendations with local context. Do not offer unrequested summaries. Keep your answer highly tailored to the user's specific question.`;

      // Convert messages to Gemini format
      const formattedContents = messages.map((m: any) => ({
        role: m.sender === "user" ? "user" : "model",
        parts: [{ text: m.content }]
      }));

      const runGeminiChat = async () => {
        const response = await generateGeminiContent(client, {
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
    originLocation: z.string().max(140).optional(),
    weather: z.string().optional(),
    travelMode: z.string().optional(),
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
      const { destination, originLocation, weather, travelMode, activityTypes, existingItemNames } = parseResult.data;
      const client = getGeminiClient();

      if (!client) {
        // High-quality fallback when Gemini API key is missing
        const isIntl = !destination.toLowerCase().includes("india") &&
          !destination.toLowerCase().includes("goa") &&
          !destination.toLowerCase().includes("karnataka");

        let suggestions = [
          { name: "High-Capacity Power Bank", category: "Activity-Specific", description: "Essential for keeping devices charged during long temple visits and hiking trails." },
          { name: "Broad-Spectrum SPF 50 Sunscreen", category: "Essentials & Toiletries", description: "Crucial for protection against high-UV indices during daytime outdoor activities." },
          { name: "Microfiber Quick-Dry Towel", category: "Essentials & Toiletries", description: "Lightweight, space-saving, and dry-fast towel for water sports and active hiking." },
          { name: "Universal Travel Plug Adapter", category: "Activity-Specific", description: isIntl ? "Required for international outlet configurations to charge laptops and phones." : "Useful for connecting multiple devices on native boards." },
          ...(originLocation ? [{ name: "Route Ticket Folder", category: "Documents", description: "Keeps origin-to-destination bookings together." }] : []),
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
      - Starting location: ${originLocation || "Not specified"}
      - Destination: ${destination}
      - Weather forecast: ${weather || "Not specified"}
      - Preferred travel mode: ${travelMode || "mixed"}
      - Planned activities types: ${JSON.stringify(activityTypes || [])}
      - Already packed/listed item names: ${JSON.stringify(existingItemNames || [])}
      
      Instructions:
      - Recommend strictly ONLY items that are NOT already listed in already packed/listed item names.
      - The suggestions must be highly customized for this origin-to-destination route, destination, weather, and activities.
      - Each item must belong to exactly one of these categories: "Clothing", "Essentials & Toiletries", "Documents", or "Activity-Specific".
      - Keep description concise (under 12 words) justifying why it's recommended.`;

      const runGeminiPacking = async () => {
        const response = await generateGeminiContent(client, {
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
          try {
            if (!message.token || !message.tripId) {
              ws.send(JSON.stringify({ type: "error", message: "Unauthorized" }));
              ws.close();
              return;
            }
            const decoded = await getAuth().verifyIdToken(message.token);
            const trip = await findTripById(message.tripId);
            if (!trip || !isCollaborator(trip, decoded.email)) {
              ws.send(JSON.stringify({ type: "error", message: "Forbidden" }));
              ws.close();
              return;
            }
            clientsMap.set(ws, { tripId: message.tripId, user: decoded });
            ws.send(JSON.stringify({ type: "joined", tripId: message.tripId }));
            broadcastPresence(message.tripId);
          } catch (err) {
            ws.send(JSON.stringify({ type: "error", message: "Unauthorized" }));
            ws.close();
          }
        } else if (message.type === "vote") {
          const info = clientsMap.get(ws);
          const { tripId, dayNumber, activityId, voteType } = message;
          if (!info || info.tripId !== tripId || !info.user?.email) return;

          const trip = tripsCache.find(t => t.id === tripId);
          if (trip && isCollaborator(trip, info.user.email)) {
            const day = trip.days.find((d: any) => d.dayNumber === dayNumber);
            if (day) {
              const activity = day.activities.find((a: any) => a.id === activityId);
              if (activity) {
                if (activity.votesUp === undefined) activity.votesUp = 0;
                if (activity.votesDown === undefined) activity.votesDown = 0;
                if (!activity.userVotes) activity.userVotes = {};

                const previousVote = activity.userVotes[info.user.email];
                if (previousVote === voteType) {
                  delete activity.userVotes[info.user.email];
                  if (voteType === "up") activity.votesUp = Math.max(0, activity.votesUp - 1);
                  if (voteType === "down") activity.votesDown = Math.max(0, activity.votesDown - 1);
                } else {
                  if (previousVote === "up") activity.votesUp = Math.max(0, activity.votesUp - 1);
                  if (previousVote === "down") activity.votesDown = Math.max(0, activity.votesDown - 1);

                  activity.userVotes[info.user.email] = voteType;
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
                  fs.promises.writeFile(TRIPS_FILE, JSON.stringify(localTrips, null, 2)).catch(console.error);
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
          const info = clientsMap.get(ws);
          if (!info || info.tripId !== message.tripId || !info.user?.email) return;

          const { tripId, comment } = message;
          const trip = tripsCache.find(t => t.id === tripId);
          if (trip && isCollaborator(trip, info.user.email)) {
            const newComment = {
              id: `comment-${randomUUID()}`,
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
              fs.promises.writeFile(TRIPS_FILE, JSON.stringify(localTrips, null, 2)).catch(console.error);
            }

            broadcastToTrip(tripId, {
              type: "comment_added",
              tripId,
              comment: newComment
            });
          }
        } else if (message.type === "invite") {
          const info = clientsMap.get(ws);
          if (!info || info.tripId !== message.tripId || !info.user?.email) return;

          const { tripId, email } = message;
          const trip = tripsCache.find(t => t.id === tripId);
          if (trip && isCollaborator(trip, info.user.email)) {
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
                fs.promises.writeFile(TRIPS_FILE, JSON.stringify(localTrips, null, 2)).catch(console.error);
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

  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Unhandled request error:", err);
    if (res.headersSent) {
      return next(err);
    }
    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Unexpected server error"
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
