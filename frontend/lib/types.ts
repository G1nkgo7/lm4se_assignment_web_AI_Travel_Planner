export interface TravelPreferences {
  destination: string;
  startDate: string;
  endDate: string;
  days: number;
  budget: number;
  travelers: number;
  interests: string[];
  notes?: string;
}

export interface ExpenseCategory {
  name: string;
  planned: number;
  actual: number;
}

export interface ItineraryDay {
  date: string;
  summary: string;
  activities: Array<{
    time: string;
    title: string;
    description: string;
    location?: string;
    budget?: number;
  }>;
}

export interface ItineraryPlan {
  id?: string;
  title: string;
  overview: string;
  days: ItineraryDay[];
  expenses: ExpenseCategory[];
}
