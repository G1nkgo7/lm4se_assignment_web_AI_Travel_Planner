export interface TravelPreferences {
  destination: string;
  startDate?: string;
  endDate?: string;
  days: number;
  budget: number;
  travelers: number;
  interests: string[];
  notes?: string;
}

export interface ItineraryActivity {
  time: string;
  title: string;
  description: string;
  location?: string;
  budget?: number;
}

export interface ItineraryDay {
  date: string;
  summary: string;
  activities: ItineraryActivity[];
  estimatedCost?: number;
}

export interface ExpenseCategory {
  name: string;
  planned: number;
  actual: number;
}

export interface ItineraryPlan {
  title: string;
  overview: string;
  days: ItineraryDay[];
  expenses: ExpenseCategory[];
}

export interface StoredTravelPlan {
  id: string;
  userId: string;
  title: string;
  overview: string;
  plan: ItineraryPlan;
  preferences: TravelPreferences;
  createdAt: string;
  updatedAt: string;
}
