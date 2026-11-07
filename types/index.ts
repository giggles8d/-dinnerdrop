export interface UserProfile {
  id: string
  familySize: number
  weeklyBudget: string
  maxCookTime: number
  cuisinePreference: string
  dietaryNeeds: string[]
  preferredStore: string
  onboardingComplete: boolean
  subscriptionStatus: 'free' | 'trialing' | 'active' | 'canceled'
}

export interface Meal {
  day: string           // Monday–Friday
  name: string
  cookTime: number      // minutes
  servings: number
  estimatedCost: number
  ingredients: Ingredient[]
  steps: string[]
  prepTime: number
  cuisine?: string      // e.g. "Italian", "Mexican"
  protein?: string      // e.g. "chicken", "beef", "tofu"
  tags?: string[]       // 'quick' | 'leftover-friendly' | 'kid-favorite' | 'sheet-pan' | ...
  nutrition?: { calories: number; protein: number; carbs?: number; fat?: number; satFat?: number; fiber?: number; sugar?: number; sodium?: number }   // per serving (g; sodium mg), estimated
  imageUrl?: string     // stored once in the recipe library (skips the Unsplash lookup)
  recipeId?: string     // public.recipes.id
  fromLibrary?: boolean // a proven dinner pulled from the library rather than freshly generated
  suggestedNight?: string // e.g. "Tuesday" — matched to that night's cook-time budget
  leftoverFriendly?: boolean
  saleItems?: string[]  // "chicken thighs $1.99/lb" — sale items this dinner was built around
  safeBite?: string     // the one plain component a picky eater can eat on its own ("plain rice")
  side?: { name: string; minutes: number; items: Ingredient[]; for?: string[] } // what goes with it (planner-given, else suggested by lib/sides); `for` = added for these people's health needs, so its items go on the list
  plateNotes?: string[] // per-person fit for health needs ("Carson: add the rice", "Cia: main is about 18 g carbs") — lib/member-needs
  usesPantry?: string[] // pantry items this dinner was built to use up
  cookedAt?: string     // ISO time the family marked it cooked (fades it on the plan)
  ideaBy?: string       // a family member suggested this dinner by text ("Rich's idea" on the vote)
  familyRecipe?: boolean // the family's own dinner, written up from how they described it (lib/family-recipes)
  addedBy?: string      // who added that family recipe (shown as "Rich's recipe")
  original?: string     // the family's own words for it
  swaps?: string[]      // easy alternatives for the vague parts ("any veg: green beans, corn, broccoli")
  familyNote?: string   // e.g. a diet conflict in their recipe, flagged rather than silently changed
  base?: { servings: number; ingredients: Ingredient[]; estimatedCost: number } // as planned, before the family changed servings for this dinner
}

export interface Ingredient {
  name: string
  quantity: string
  unit: string
  category: GroceryCategory
  searchTerm?: string   // normalized term for store lookup (the planner fills this in)
}

export type GroceryCategory =
  | 'Produce'
  | 'Meat & Seafood'
  | 'Dairy & Eggs'
  | 'Pantry & Dry Goods'
  | 'Frozen'
  | 'Bakery'
  | 'Beverages'

export interface GroceryItem {
  name: string
  quantity: string
  unit: string
  category: GroceryCategory
  searchTerm: string    // normalized term for Instacart API lookup
}

export interface Favorite {
  id: string
  userId: string
  mealName: string
  mealData: Meal
  createdAt: string
}

export interface MealPlan {
  id: string
  userId: string
  weekStart: string
  meals: Meal[]
  groceryList: Record<GroceryCategory, GroceryItem[]>
  totalEstimatedCost: number
  storeLink?: string
}
