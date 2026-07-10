export type TravelCategory = "culture" | "food" | "nature" | "activity" | "general";

export interface Activity {
  id: string;
  time: string;
  title: string;
  description: string;
  bestPart?: string;
  cost: number;
  rating?: number;
  category: TravelCategory;
  isMustSee?: boolean;
  votesUp: number;
  votesDown: number;
  userVote?: "up" | "down" | null;
  userVotes?: Record<string, "up" | "down">;
  latitude?: number;
  longitude?: number;
}

export interface DayPlan {
  dayNumber: number;
  title: string;
  activities: Activity[];
}

export interface Collaborator {
  email: string;
  name: string;
  avatar: string;
  joinedAt?: string;
}

export interface Comment {
  id: string;
  author: string;
  avatar: string;
  content: string;
  timestamp: string;
}

export interface TravelDocument {
  id: string;
  name: string;
  category: "boarding-pass" | "hotel" | "ticket" | "id" | "other";
  size: string;
  uploadedBy: string;
  uploadedAt: string;
  content: string;
}

export interface Itinerary {
  id?: string;
  title: string;
  destination?: string;
  tripType?: string;
  createdAt?: string;
  durationDays: number;
  travelersCount: number;
  estimatedBudget: number;
  days: DayPlan[];
  budgetRange?: string;
  travelStyle?: string;
  interests?: string[];
  collaborators?: Collaborator[];
  comments?: Comment[];
  documents?: TravelDocument[];
}

export interface PackingItem {
  id: string;
  category: "Clothing" | "Essentials & Toiletries" | "Documents" | "Activity-Specific";
  name: string;
  description?: string;
  checked: boolean;
}

export interface Expense {
  id: string;
  category: "food" | "transport" | "tickets" | "other";
  title: string;
  paidBy: string;
  amount: number;
  date: string;
  avatars: string[];
}

export interface Settlement {
  id: string;
  avatar: string;
  debtor: string;
  amount: number;
  settled: boolean;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  content: string;
  timestamp: string;
  richCard?: any; // To render the custom WanderWay itinerary offer card inside chat
}
