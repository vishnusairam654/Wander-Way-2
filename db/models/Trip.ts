import mongoose, { Schema, Document } from "mongoose";

export interface ITripActivity {
  id: string;
  time: string;
  title: string;
  description: string;
  bestPart: string;
  cost: number;
  rating?: number;
  category: "culture" | "food" | "nature" | "activity" | "general";
  isMustSee: boolean;
  votesUp: number;
  votesDown: number;
  userVotes: Record<string, "up" | "down">;
  latitude?: number;
  longitude?: number;
}

export interface ITripDay {
  dayNumber: number;
  title: string;
  activities: ITripActivity[];
}

export interface ICollaborator {
  email: string;
  name: string;
  avatar: string;
  joinedAt?: string;
}

export interface IComment {
  id: string;
  author: string;
  avatar: string;
  content: string;
  timestamp: string;
}

export interface IDocument {
  id: string;
  name: string;
  category: string;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
  storageKey: string;
  content?: string;
}

export interface ITrip extends Document {
  id: string; // The application-level ID used by the client (e.g. "trip-123")
  title: string;
  originLocation?: string;
  destination: string;
  tripType: string;
  durationDays: number;
  travelersCount: number;
  estimatedBudget: number;
  createdAt: string;
  budgetRange: string;
  travelStyle: string;
  travelMode?: string;
  interests: string[];
  days: ITripDay[];
  collaborators: ICollaborator[];
  comments: IComment[];
  documents: IDocument[];
}

const tripActivitySchema = new Schema<ITripActivity>({
  id: { type: String, required: true },
  time: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  bestPart: { type: String, required: true },
  cost: { type: Number, required: true },
  rating: { type: Number },
  category: {
    type: String,
    required: true,
    enum: ["culture", "food", "nature", "activity", "general"]
  },
  isMustSee: { type: Boolean, required: true },
  votesUp: { type: Number, default: 0 },
  votesDown: { type: Number, default: 0 },
  userVotes: { type: Map, of: String, default: {} }, // Map of email -> "up"|"down"
  latitude: { type: Number },
  longitude: { type: Number }
});

const tripDaySchema = new Schema<ITripDay>({
  dayNumber: { type: Number, required: true },
  title: { type: String, required: true },
  activities: [tripActivitySchema]
});

const collaboratorSchema = new Schema<ICollaborator>({
  email: { type: String, required: true },
  name: { type: String, required: true },
  avatar: { type: String, required: true },
  joinedAt: { type: String }
});

const commentSchema = new Schema<IComment>({
  id: { type: String, required: true },
  author: { type: String, required: true },
  avatar: { type: String, required: true },
  content: { type: String, required: true },
  timestamp: { type: String, required: true }
});

const documentSchema = new Schema<IDocument>({
  id: { type: String, required: true },
  name: { type: String, required: true },
  category: { type: String, required: true },
  size: { type: Number, required: true },
  uploadedBy: { type: String, required: true },
  uploadedAt: { type: String, required: true },
  storageKey: { type: String, required: true },
  content: { type: String, required: false }
});

const tripSchema = new Schema<ITrip>({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  originLocation: { type: String },
  destination: { type: String, required: true },
  tripType: { type: String, required: true },
  durationDays: { type: Number, required: true },
  travelersCount: { type: Number, required: true },
  estimatedBudget: { type: Number, required: true },
  createdAt: { type: String, required: true },
  budgetRange: { type: String, required: true },
  travelStyle: { type: String, required: true },
  travelMode: { type: String },
  interests: [{ type: String }],
  days: [tripDaySchema],
  collaborators: [collaboratorSchema],
  comments: [commentSchema],
  documents: [documentSchema]
});

export const TripModel = mongoose.models.Trip || mongoose.model<ITrip>("Trip", tripSchema);
