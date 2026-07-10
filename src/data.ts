import { Itinerary, PackingItem, Expense, Settlement, ChatMessage } from "./types";

export const AVATARS = {
  arjun: "https://lh3.googleusercontent.com/aida-public/AB6AXuAsWvNhsNQ6US77s4jK5Cww7lCxGGBh0PXH5e5pRWCugsL91W3xmmtk-oNWPEwW1wL2Fw0jCRkYgP6QG2bZRoU0V2eYDoOm6BxAfK9ggFhf8R6niTFyBKXkxsXxwdYF3iHOJ4uR3gzeDWA4BDMhhFbcfAh2VXhb2Vk5GMTTRc3DMhmR2Z6HOiiE34qVw3xK08zGRMkjPupnxO45mHzO0zJN-l-HnDbOt0yQlwdQSAZMEyGgE3KA9H4nEZHewrsYYB4UaQSnnyS8RW0",
  priya: "https://lh3.googleusercontent.com/aida-public/AB6AXuAcfS_4_4reic5olAkwrcQgm_gou82PxPpZdhMlzTL09lj4yKltsyGy7b11h3eYvrdZbS_D6WZs3BbQoPldj5rvzLjRPxrSaQ_5_6AIHXkrikkwJG8abivE4fy8_qEqMRnO0rmAf0328IguivSEVTIxXSiIyAiR3N5mqZRHnEClXNls2Ki-Uv0ow2UcsL5w2JgRfQD1QSuExdOUuWMQwbl_dCq_1lCjQbqQrKNGw54fw584KLYyAtflcTeQ2G47Ca0qypaO09uK6Gk",
  rahul: "https://lh3.googleusercontent.com/aida-public/AB6AXuDOO8RuFixchq-NGjjGwhna7f4LaydVEitLLnUReOS8PRSmjxay00B1LwItH83cknaGmw_qqxqh4TVNlxcebvrx6eUZ138s7c3c5IKipo_li8eK69YszVQSwUOhU_4nemO9OIdFsZzt0fqvXV5rYNDmyCcGU5YbPdPrlPXUVdvT_TeGKBzGSffzoAYMEUW7ctb7ZD215SqU-YYAqqO-grAhuycz5qs6gGYdZEyOnziUzNc1stuo0Z4waKBp0YVWHEc3lqvFVhkChj4",
  sarah: "https://lh3.googleusercontent.com/aida-public/AB6AXuA5UdnblaxoTTzPdTucQv-2L-i_6u1QCOkcDrj2RU0q73YOuqikq_9_w_lCayfcm303TaIWhKIxhKwxpWanqaD779R1nHZM3gHwpz8q81VmJYMXwmsB0MRJOkC_d_d6bBtHewxFtamhrWJ3JFtMKbeUWkYeVyfDpK2oWSooH6RKWLndKh3Q0jlB-oZOnMQcErv2HcBOjiEczLLPS2jTlEYPb7Q2dU4cagVeMRMqCEiongIQy_b73rhcKpgXCnMULH3UapWON1DL2lo",
  collab1: "https://lh3.googleusercontent.com/aida-public/AB6AXuCPhIRzW08Qe3QNLwQP8y34YVGA9OdsOJ4pFrZ81r5sO01gX3JkYJrWkJevb__z3KMuHwp6ZgYrwJ6E0FYA1wR8JSDrUw3_YiEfPoWdUazJU6bZTTYOHqEkjnhYEcx7N9O7tVWBBZBcWsXn6YVn6lj_AkaM0m_tUgiGgPWp0N4d_k6hHkKi79YGkWgaW3Nmx6iSpRYQT1oCoVQrkbowW8Bz9BPReFnvX93LcuNvpTJKWtm0vAVBVU6gTtB5qTzcy0PVGYrlQkNYUx4",
  collab2: "https://lh3.googleusercontent.com/aida-public/AB6AXuCXc5R9wFYiVV5nWH_-jwUrszpkPh96F3UUmwXEX1ct7xFtoPE5NKSrlfB2o3vEUndTmYLcvTOQM5iLpysvmmGwjaL_dipJioZF9t3Y82wJtbfP7yDvTZi9rkPNX5cCCPidlZhchjPWYNSqvMTgmUaukOrTEN8oJcYYRvv5pxEq-cwa2Ph9AoKH5AMgPbp9RK4i-oLkM4vMlZoRhDU4uwFl9XK7vNCTcUvFpOYXEca7xNlBxYnRPk4rXfLeqKe1FrCJnCcf6PNGcEQ",
  collab3: "https://lh3.googleusercontent.com/aida-public/AB6AXuD4FKLS2CC2YcCK8pSLXrjJpnRxIZG5F7ZWfkxIhRyIBvIKfeMMbORQLcgqmFacFG3xNhugy1fg7PZyTn_y1FihsWAlDGiIn-GgOCOBELEgbC-HKKspID3XrvocpRmZw5fqD4i-AMzHA_88sDFZ2tJJnKWkTqu48rcqLcxUdrMjy4vBBRs1mp8igqWGT9-VJljeulEWgP5DWNHgAtMQW1QbTmiOTn3sy4FNJwS69KBFgW7LpsXsOyq9AUszDADDpmsU4Xc3UWPSokY",
  collab4: "https://lh3.googleusercontent.com/aida-public/AB6AXuCOt42OGHR7Vs9H0ajrDjLgkfr7eNioHq1XoLM9E2PEsGyY_c-srjf5oImzFuhLwU2301Tc2IdWFkO298-KCsyYqhuuNLX5aFan9yLvoHtglpuboyN7uFIkml7SYOB1uJQqchtO3ZNIQ_9L9sQYBkYXrdDuXWjqedZhY6NXbij64oApOwAoW49OLkAvzeJw_qFglTRuXxh8TsVMdYredxA9bCDRzQIhCJIRFZcvKRMR20-LQkXbi90dpn9RLaqVpIe_xT4C0wjGRo0"
};

export const HAMPI_IMAGE = "https://lh3.googleusercontent.com/aida/AP1WRLt7vjoJ9LziWTnZ64b8v_Z-cjAcjMlMyQvbQyV4yMnkNBPVqNa_WjViBzvX4L5I0bLu84O5APX3w0oaguVwRR15_qZb7U_QAm4whyh3joXCiiJa8anWren17vs7Q99qaZb1m_GFLY2OBoMmIlZR6IVrS2CsnHspLghrWHITw-e1vsp0gyr08j_e7BYi2iw6ugzjQYXV68uGVWsiQE3pSQ5zD92X5R2GvTri0H3uTevYrqZ6Q8Pj7ieanNU";
export const MAP_BACKGROUND_IMAGE = "https://lh3.googleusercontent.com/aida-public/AB6AXuAysmDDYq1YYBtw8ORac5tOQbm1c8Mb85U_TTnBDdHpSmuAFF3xDeapY9YkA4d7bmgutKHce8cqgwneUsqGfQCe6osG-4htbCDXdCTSE6ekJU-7rU5GInthgwr-UPuBWUAVfL784B2VVH3Ri0EUbCNcVd7dTe_t0AP_kETT30C2v2LSwK-7E3_nY0AKU7d73Nhju9SNIpueeqoNJl_Tx1nFvaCEd3ySffAVJYvxrPtLPlmpkzqJrsBEOB1UxnlxaUnTS36LIwz2wbk";
export const COMPASS_ILLUSTRATION = "https://lh3.googleusercontent.com/aida-public/AB6AXuB5dGUmaML_Ph-aWXxXNxgArb602QSsMFncBEdBCDxoKvpYnSRSOxomuTjPpkRQ_scpP9E_8HaIFkxT7uKgsNFlC1Y0_rpjsN71lypqs189FBg6ctsTmCgJ_c-Va1dowCGWWe_kBumrZehHEkgha_9zJ61EMYSJLaHKXTZ-HUu42WX6-MfuZ1x5NJCEAFpFzdfW5LaKtNIA7V8wcoVHixtDp2_aEnd46sqP8TP9NXn08sClhE0haPmHfPRXpRPcN_FCMauy_VOjYG8";

export const INITIAL_HAMPI_ITINERARY: Itinerary = {
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
          bestPart: "The 50-meter gopuram is the highest in Hampi and a masterpiece of Drow & Vijayanagara architecture.",
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
          bestPart: "A wonderful meal on a banana leaf while feeling the river breeze.",
          cost: 1200,
          rating: 4.5,
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
          bestPart: "The boat spinning slowly in the water next to giant orange boulders.",
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

export const INITIAL_PACKING_ITEMS: PackingItem[] = [
  { id: "pack-1", category: "Clothing", name: "Lightweight Cotton Shirts (x4)", checked: true },
  { id: "pack-2", category: "Clothing", name: "Comfortable Walking Pants (x2)", checked: true },
  { id: "pack-3", category: "Clothing", name: "Light Jacket or Windbreaker", description: "For early morning sunrise hikes", checked: false },
  { id: "pack-4", category: "Clothing", name: "Breathable Socks (x5)", checked: false },
  { id: "pack-5", category: "Clothing", name: "Hat or Cap", description: "Sun protection is essential", checked: false },
  
  { id: "pack-6", category: "Essentials & Toiletries", name: "Sunscreen (SPF 50+)", checked: false },
  { id: "pack-7", category: "Essentials & Toiletries", name: "Mosquito Repellent", checked: false },
  { id: "pack-8", category: "Essentials & Toiletries", name: "Basic First Aid Kit", description: "Bandaids, antiseptic, pain relievers", checked: false },
  { id: "pack-9", category: "Essentials & Toiletries", name: "Reusable Water Bottle", checked: false },
  
  { id: "pack-10", category: "Documents", name: "ID Card / Passport", checked: true },
  { id: "pack-11", category: "Documents", name: "Hotel Booking Confirmations", checked: false },
  
  { id: "pack-12", category: "Activity-Specific", name: "Sturdy Walking Shoes", description: "Crucial for rocky ruins terrain", checked: false },
  { id: "pack-13", category: "Activity-Specific", name: "Camera & Extra Batteries", checked: false },
  { id: "pack-14", category: "Activity-Specific", name: "Small Daypack", checked: false }
];

export const INITIAL_EXPENSES: Expense[] = [
  {
    id: "exp-1",
    category: "food",
    title: "Dinner at Mango Tree",
    paidBy: "Arjun",
    amount: 1800,
    date: "Oct 14",
    avatars: [AVATARS.arjun, AVATARS.priya, AVATARS.rahul, AVATARS.sarah]
  },
  {
    id: "act-rickshaw",
    category: "transport",
    title: "Rickshaw - Day 2",
    paidBy: "Sarah",
    amount: 450,
    date: "Oct 13",
    avatars: [AVATARS.sarah, AVATARS.rahul]
  },
  {
    id: "exp-3",
    category: "tickets",
    title: "Entry Fees - Virupaksha",
    paidBy: "Arjun",
    amount: 1200,
    date: "Oct 12",
    avatars: [AVATARS.arjun]
  }
];

export const INITIAL_SETTLEMENTS: Settlement[] = [
  { id: "set-1", debtor: "Priya", avatar: AVATARS.priya, amount: 2400, settled: false },
  { id: "set-2", debtor: "Rahul", avatar: AVATARS.rahul, amount: 1975, settled: false },
  { id: "set-3", debtor: "Sarah", avatar: AVATARS.sarah, amount: 850, settled: true }
];

export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: "msg-1",
    sender: "ai",
    content: "Hi there! Ready to plan your next adventure? Tell me a bit about what kind of trip you're looking for.",
    timestamp: "Today, 10:42 AM"
  },
  {
    id: "msg-2",
    sender: "user",
    content: "I want to go somewhere historic in India for about a week, focusing on architecture and ruins. Not too crowded if possible.",
    timestamp: "Today, 10:43 AM"
  },
  {
    id: "msg-3",
    sender: "ai",
    content: "I've curated a 5-day heritage trip to Hampi. It's a UNESCO World Heritage site filled with captivating ruins and a remarkably serene landscape of boulder-strewn hills.\n\nShall we look at the stay options?",
    timestamp: "Today, 10:44 AM",
    richCard: {
      title: "Hampi Heritage Trail",
      description: "Journey through the magnificent ruins of the Vijayanagara Empire, where ancient stone temples meet a surreal landscape of golden boulders.",
      duration: "5 Days",
      budget: "₹25k - ₹35k",
      route: "Bangalore → Hampi → Bangalore",
      mainPlaces: "Virupaksha Temple, Vitthala Temple, Hemakuta Hill",
      location: "Karnataka, India",
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBg6jTgdTFRP_rwPKvaxTjw1oodBxPeupesWY2I2wIvHr-gqYMK96m_C9qunpT83wjePddcXd3ceL2uSvbyb5Nf02WnnKnKDmrBdXG3RggIRd7PwtivIsW2gb-DBG_MjB_2FvtGULY-s8aSzd4M2dzHUNjRuUtV7giH7D9zZhLmR6tpFWPdsAavPGarq2138Vfut0T9ulNug9zFcAe2XKQzbmjcI2Qz490jB1-8SBz_XubQxcYvHOEedEVpHvhaVSrbXTJYMcO8vcc"
    }
  }
];
