<div align="center">
  <h1>🌍 WanderWay</h1>
  <p><strong>Your AI-Powered Travel Companion & Collaborative Itinerary Planner</strong></p>
</div>

WanderWay is a modern, full-stack travel planning application that leverages the power of generative AI to create highly personalized travel itineraries. Whether you're planning a solo backpacking trip or a group vacation, WanderWay handles everything from intelligent route planning to real-time collaborative voting, dynamic packing lists, and expense tracking.

---

## ✨ Features

- **🤖 AI-Powered Planning:** Generate complete day-by-day itineraries using Google's Gemini AI. The AI considers your origin, destination, travel mode, theme, and climate.
- **🤝 Real-Time Collaboration:** Invite friends to your trip. Vote on activities and sync updates instantly using WebSockets.
- **🗺️ Interactive Map View:** Visualize your journey and daily activities on an interactive map layout.
- **🎒 Context-Aware Packing & Documents:** Get dynamic, AI-generated packing and required document lists tailored specifically to the climate and theme of your destination.
- **💰 Expense Tracking:** Easily split bills, track trip expenses, and monitor budget categories among your group.
- **🔐 Secure Authentication:** Powered by Firebase Authentication for seamless sign-in and session management.
- **☁️ Data Persistence:** Stores your trips securely using MongoDB.

---

## 🚀 Tech Stack

### Frontend
- **Framework:** React 19 with Vite
- **Styling:** Tailwind CSS v4 for utility-first, modern UI design
- **Animations:** Motion (Framer Motion)
- **Icons & Charts:** Lucide React, Recharts

### Backend
- **Server:** Node.js with Express
- **AI Integration:** `@google/genai` (Gemini API)
- **Database:** MongoDB (using Mongoose)
- **Real-time:** `ws` (WebSockets)
- **Auth:** Firebase Admin SDK

---

## 🛠️ Local Development Setup

**Prerequisites:**  
- Node.js (v18+)
- MongoDB (local instance or MongoDB Atlas)
- Firebase Project (for Auth & Admin SDK)
- Gemini API Key

### 1. Install dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory and add the following keys:

```env
# AI Integration
GEMINI_API_KEY="your_gemini_api_key_here"

# Database
MONGODB_URI="your_mongodb_connection_string"

# Firebase Admin SDK (for Backend)
FIREBASE_PROJECT_ID="your_project_id"
FIREBASE_CLIENT_EMAIL="your_client_email"
FIREBASE_PRIVATE_KEY="your_private_key"
```

*Note: You also need to configure your frontend Firebase setup in `src/config/firebase.ts`.*

### 3. Run the Development Server
```bash
npm run dev
```

The app will run using `tsx` to serve the Express backend alongside the Vite frontend in development mode.

### 4. Build for Production
```bash
npm run build
```
This command compiles the React frontend (via Vite) and bundles the Node.js server (via esbuild) into the `dist/` directory. You can then run it using `npm start`.

---

## 📁 Document Storage Note

Uploaded trip documents (e.g., flight tickets, visas) are currently stored on the local disk in `server/uploads/` and are served through authenticated API routes.

> **Warning for Production Deployment:** 
> This local storage mode is suitable for local development only. Most PaaS deployments use ephemeral file systems, so uploaded files will not persist across redeploys. For a production environment, it is highly recommended to migrate document storage to an object store such as AWS S3 or Google Cloud Storage.

---

## 📄 License

This project is open-source and available under the MIT License.
