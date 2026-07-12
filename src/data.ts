import { PackingItem, Expense, Settlement, ChatMessage } from "./types";

export const AVATARS = {
  arjun: "https://lh3.googleusercontent.com/aida-public/AB6AXuAsWvNhsNQ6US77s4jK5Cww7lCxGGBh0PXH5e5pRWCugsL91W3xmmtk-oNWPEwW1wL2Fw0jCRkYgP6QG2bZRoU0V2eYDoOm6BxAfK9ggFhf8R6niTFyBKXkxsXxwdYF3iHOJ4uR3gzeDWA4BDMhhFbcfAh2VXhb2Vk5GMTTRc3DMhmR2Z6HOiiE34qVw3xK08zGRMkjPupnxO45mHzO0zJN-l-HnDbOt0yQlwdQSAZMEyGgE3KA9H4nEZHewrsYYB4UaQSnnyS8RW0",
  priya: "https://lh3.googleusercontent.com/aida-public/AB6AXuAcfS_4_4reic5olAkwrcQgm_gou82PxPpZdhMlzTL09lj4yKltsyGy7b11h3eYvrdZbS_D6WZs3BbQoPldj5rvzLjRPxrSaQ_5_6AIHXkrikkwJG8abivE4fy8_qEqMRnO0rmAf0328IguivSEVTIxXSiIyAiR3N5mqZRHnEClXNls2Ki-Uv0ow2UcsL5w2JgRfQD1QSuExdOUuWMQwbl_dCq_1lCjQbqQrKNGw54fw584KLYyAtflcTeQ2G47Ca0qypaO09uK6Gk",
  rahul: "https://lh3.googleusercontent.com/aida-public/AB6AXuDOO8RuFixchq-NGjjGwhna7f4LaydVEitLLnUReOS8PRSmjxay00B1LwItH83cknaGmw_qqxqh4TVNlxcebvrx6eUZ138s7c3c5IKipo_li8eK69YszVQSwUOhU_4nemO9OIdFsZzt0fqvXV5rYNDmyCcGU5YbPdPrlPXUVdvT_TeGKBzGSffzoAYMEUW7ctb7ZD215SqU-YYAqqO-grAhuycz5qs6gGYdZEyOnziUzNc1stuo0Z4waKBp0YVWHEc3lqvFVhkChj4",
  sarah: "https://lh3.googleusercontent.com/aida-public/AB6AXuA5UdnblaxoTTzPdTucQv-2L-i_6u1QCOkcDrj2RU0q73YOuqikq_9_w_lCayfcm303TaIWhKIxhKwxpWanqaD779R1nHZM3gHwpz8q81VmJYMXwmsB0MRJOkC_d_d6bBtHewxFtamhrWJ3JFtMKbeUWkYeVyfDpK2oWSooH6RKWLndKh3Q0jlB-oZOnMQcErv2HcBOjiEczLLPS2jTlEYPb7Q2dU4cagVeMRMqCEiongIQy_b73rhcKpgXCnMULH3UapWON1DL2lo"
};

export const MAP_BACKGROUND_IMAGE = "https://lh3.googleusercontent.com/aida-public/AB6AXuAysmDDYq1YYBtw8ORac5tOQbm1c8Mb85U_TTnBDdHpSmuAFF3xDeapY9YkA4d7bmgutKHce8cqgwneUsqGfQCe6osG-4htbCDXdCTSE6ekJU-7rU5GInthgwr-UPuBWUAVfL784B2VVH3Ri0EUbCNcVd7dTe_t0AP_kETT30C2v2LSwK-7E3_nY0AKU7d73Nhju9SNIpueeqoNJl_Tx1nFvaCEd3ySffAVJYvxrPtLPlmpkzqJrsBEOB1UxnlxaUnTS36LIwz2wbk";
export const COMPASS_ILLUSTRATION = "https://lh3.googleusercontent.com/aida-public/AB6AXuB5dGUmaML_Ph-aWXxXNxgArb602QSsMFncBEdBCDxoKvpYnSRSOxomuTjPpkRQ_scpP9E_8HaIFkxT7uKgsNFlC1Y0_rpjsN71lypqs189FBg6ctsTmCgJ_c-Va1dowCGWWe_kBumrZehHEkgha_9zJ61EMYSJLaHKXTZ-HUu42WX6-MfuZ1x5NJCEAFpFzdfW5LaKtNIA7V8wcoVHixtDp2_aEnd46sqP8TP9NXn08sClhE0haPmHfPRXpRPcN_FCMauy_VOjYG8";

export const INITIAL_PACKING_ITEMS: PackingItem[] = [];

export const INITIAL_EXPENSES: Expense[] = [];

export const INITIAL_SETTLEMENTS: Settlement[] = [];

export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: "msg-1",
    sender: "ai",
    content: "Ready to plan? Share destination, duration, and vibe, and I will draft your first itinerary.",
    timestamp: "Now"
  }
];
