const fs = require('fs');
const path = require('path');

let content = fs.readFileSync('server.ts', 'utf8');

// 1. Add imports
content = content.replace('import pRetry from "p-retry";', 
`import pRetry from "p-retry";
import { connectDB } from "./db/connection";
import { UserModel } from "./db/models/User";
import { TripModel } from "./db/models/Trip";`);

// 2. Replace loadData with initDB and tripsCache
const loadDataRegex = /\/\/ Persistent file paths[\s\S]*?loadData\(\);\n/m;
content = content.replace(loadDataRegex, 
`// Persistent file paths
const USERS_FILE = path.join(process.cwd(), "users.json");
const TRIPS_FILE = path.join(process.cwd(), "trips.json");

let tripsCache: any[] = [];

async function refreshTripsCache() {
  tripsCache = await TripModel.find({}).lean();
}

async function initDB() {
  try {
    await connectDB();
    const userCount = await UserModel.countDocuments();
    if (userCount === 0) {
      console.log("Seeding users...");
      if (fs.existsSync(USERS_FILE)) {
        const seedUsers = JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
        await UserModel.insertMany(seedUsers);
        console.log("Users seeded from JSON.");
      }
    }

    const tripCount = await TripModel.countDocuments();
    if (tripCount === 0) {
      console.log("Seeding trips...");
      if (fs.existsSync(TRIPS_FILE)) {
        const seedTrips = JSON.parse(fs.readFileSync(TRIPS_FILE, "utf8"));
        await TripModel.insertMany(seedTrips);
        console.log("Trips seeded from JSON.");
      }
    }
    
    await refreshTripsCache();
  } catch (err) {
    console.error("Error initializing DB:", err);
  }
}
`);

// 3. Add initDB() to startServer()
content = content.replace('async function startServer() {\n  const app = express();',
`async function startServer() {
  await initDB();
  const app = express();`);

// 4. Update Signup
content = content.replace(/app\.post\("\/api\/auth\/signup"[\s\S]*?\/\/ Authentication API 2: Login/m,
`app.post("/api/auth/signup", async (req, res) => {
    try {
      const { email, password, name } = req.body;
      if (!email || !password || !name) {
        return res.status(400).json({ error: "Missing required signup fields." });
      }

      const existingUser = await UserModel.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({ error: "Email is already registered." });
      }

      const salt = crypto.randomBytes(16).toString("hex");
      const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");

      const avatar = \`https://api.dicebear.com/7.x/adventurer/svg?seed=\${encodeURIComponent(name)}\`;
      const newUser = await UserModel.create({ email, name, avatar, salt, hash });

      res.json({ success: true, user: { email, name, avatar } });
    } catch (err: any) {
      console.error("Signup error:", err);
      res.status(500).json({ error: err.message || "Error occurred during registration." });
    }
  });

  // Authentication API 2: Login`);

// 5. Update Login
content = content.replace(/app\.post\("\/api\/auth\/login"[\s\S]*?\/\/ Authentication API 3: Google Sign-In/m,
`app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required." });
      }

      const user = await UserModel.findOne({ email: email.toLowerCase() });
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

  // Authentication API 3: Google Sign-In`);

// 6. Update Google Signin
content = content.replace(/app\.post\("\/api\/auth\/google-signin"[\s\S]*?\/\/ API 1: Generate dynamic/m,
`app.post("/api/auth/google-signin", async (req, res) => {
    try {
      const { email, name, avatar } = req.body;
      if (!email || !name) {
        return res.status(400).json({ error: "Google user email and name are required." });
      }

      const defaultAvatar = avatar || \`https://api.dicebear.com/7.x/adventurer/svg?seed=\${encodeURIComponent(name)}\`;
      
      const user = await UserModel.findOneAndUpdate(
        { email: email.toLowerCase() },
        { 
          $setOnInsert: { 
            name, 
            avatar: defaultAvatar, 
            salt: "google-auth", 
            hash: "google-auth-external" 
          }
        },
        { upsert: true, new: true }
      );

      res.json({ success: true, user: { email: user.email, name: user.name, avatar: user.avatar } });
    } catch (err: any) {
      console.error("Google login error:", err);
      res.status(500).json({ error: err.message || "Error during Google authentication." });
    }
  });

  // API 1: Generate dynamic`);

// 7. Generate Itinerary endpoint
content = content.replace(/if \(!trips\.some\(t => t\.id === "hampi-heritage-trail"\)\) {[\s\S]*?trips\.push\(customHampi\);\s*fs\.writeFileSync\(TRIPS_FILE, JSON\.stringify\(trips, null, 2\)\);\s*}/m,
`const existingHampi = await TripModel.findOne({ id: "hampi-heritage-trail" });
        if (!existingHampi) {
          await TripModel.create(customHampi);
          await refreshTripsCache();
        }`);

content = content.replace(/trips\.push\(parsedItinerary\);\s*fs\.writeFileSync\(TRIPS_FILE, JSON\.stringify\(trips, null, 2\)\);/m,
`await TripModel.create(parsedItinerary);
      await refreshTripsCache();`);

// 8. GET /api/trips and /api/trips/:id
content = content.replace(/app\.get\("\/api\/trips", \(req, res\) => {[\s\S]*?}\);/m,
`app.get("/api/trips", async (req, res) => {
    const trips = await TripModel.find({}).lean();
    res.json({ trips });
  });`);

content = content.replace(/app\.get\("\/api\/trips\/:id", \(req, res\) => {[\s\S]*?}\);/m,
`app.get("/api/trips/:id", async (req, res) => {
    const trip = await TripModel.findOne({ id: req.params.id }).lean();
    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }
    res.json({ trip });
  });`);

// 9. GET /api/trips/:id/documents
content = content.replace(/app\.get\("\/api\/trips\/:id\/documents", \(req, res\) => {[\s\S]*?}\);/m,
`app.get("/api/trips/:id/documents", async (req, res) => {
    const trip = await TripModel.findOne({ id: req.params.id }).lean();
    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }
    res.json({ documents: trip.documents || [] });
  });`);

// 10. POST /api/trips/:id/documents
content = content.replace(/app\.post\("\/api\/trips\/:id\/documents", \(req, res\) => {[\s\S]*?res\.json\({ success: true, document: newDoc }\);\s*}\);/m,
`app.post("/api/trips/:id/documents", async (req, res) => {
    const trip = await TripModel.findOne({ id: req.params.id });
    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }
    const { name, category, size, uploadedBy, content } = req.body;
    if (!name || !category || !size || !uploadedBy || !content) {
      return res.status(400).json({ error: "Missing required document fields." });
    }

    const newDoc = {
      id: \`doc-\${Date.now()}\`,
      name,
      category,
      size,
      uploadedBy,
      uploadedAt: new Date().toISOString(),
      content
    };

    const updatedTrip = await TripModel.findOneAndUpdate(
      { id: req.params.id },
      { $push: { documents: newDoc } },
      { new: true }
    ).lean();
    
    await refreshTripsCache();

    if (updatedTrip) {
      broadcastToTrip(updatedTrip.id, {
        type: "documents_updated",
        tripId: updatedTrip.id,
        documents: updatedTrip.documents
      });
    }

    res.json({ success: true, document: newDoc });
  });`);

// 11. DELETE /api/trips/:id/documents/:docId
content = content.replace(/app\.delete\("\/api\/trips\/:id\/documents\/:docId", \(req, res\) => {[\s\S]*?res\.json\({ success: true }\);\s*}\);/m,
`app.delete("/api/trips/:id/documents/:docId", async (req, res) => {
    const docId = req.params.docId;
    const updatedTrip = await TripModel.findOneAndUpdate(
      { id: req.params.id },
      { $pull: { documents: { id: docId } } },
      { new: true }
    ).lean();

    if (!updatedTrip) {
      return res.status(404).json({ error: "Trip not found" });
    }

    await refreshTripsCache();

    broadcastToTrip(updatedTrip.id, {
      type: "documents_updated",
      tripId: updatedTrip.id,
      documents: updatedTrip.documents
    });

    res.json({ success: true });
  });`);

// 12. WebSocket - Change trips.find to tripsCache.find, and add DB updates
// We'll replace the inside of the message handlers.
content = content.replace(/const trip = trips\.find\(t => t\.id === tripId\);/g, 'const trip = tripsCache.find(t => t.id === tripId);');

// WS Vote
content = content.replace(/fs\.writeFileSync\(TRIPS_FILE, JSON\.stringify\(trips, null, 2\)\);/g,
`// Update DB in background
                TripModel.updateOne(
                  { id: tripId, "days.dayNumber": dayNumber, "days.activities.id": activityId },
                  { 
                    $set: { 
                      "days.$[day].activities.$[act].votesUp": activity.votesUp,
                      "days.$[day].activities.$[act].votesDown": activity.votesDown,
                      "days.$[day].activities.$[act].userVotes": activity.userVotes
                    } 
                  },
                  { arrayFilters: [{ "day.dayNumber": dayNumber }, { "act.id": activityId }] }
                ).exec();`);

// Fix second writeFileSync (Comment) - the regex above replaced all, but wait, the replacement is specific to Vote.
// Let's rollback and be more precise.
`);
