'use strict';

/* =========================================================
   বাজার সদাই: আগে থেকে ভরা সাধারণ পণ্যের তালিকা (নাম লিখতে হয় না, ট্যাপ করলেই যোগ হয়)
   প্রতিটা: [বাংলা নাম, English name, বিভাগের কী (BZ_CATS), এককের কী]
   ========================================================= */

const BZ_UNIT_LABEL = {
  kg: ['কেজি', 'kg'], g: ['গ্রাম', 'g'], l: ['লিটার', 'litre'], ml: ['মিলি', 'ml'], pcs: ['পিস', 'pcs'], dz: ['ডজন', 'dozen'], hl: ['হালি', 'hali'],
  pk: ['প্যাকেট', 'packet'], bt: ['বোতল', 'bottle'], bag: ['বস্তা', 'bag'], bn: ['আঁটি', 'bunch'],
};

const BZ_CATALOG = [
  // চাল, ডাল ও শস্য
  ['চাল (মিনিকেট)', 'Rice (Miniket)', 'grain', 'kg'], ['চাল (নাজিরশাইল)', 'Rice (Nazirshail)', 'grain', 'kg'], ['চাল (মোটা)', 'Rice (coarse)', 'grain', 'kg'], ['পোলাওয়ের চাল', 'Polao rice', 'grain', 'kg'],
  ['আটা', 'Flour (atta)', 'grain', 'kg'], ['ময়দা', 'Maida', 'grain', 'kg'], ['সুজি', 'Semolina', 'grain', 'kg'], ['চিড়া', 'Flattened rice', 'grain', 'kg'], ['মুড়ি', 'Puffed rice', 'grain', 'kg'],
  ['মসুর ডাল', 'Red lentil', 'grain', 'kg'], ['মুগ ডাল', 'Moong dal', 'grain', 'kg'], ['ছোলার ডাল', 'Chana dal', 'grain', 'kg'], ['মাষকলাই ডাল', 'Black gram dal', 'grain', 'kg'], ['অড়হর ডাল', 'Pigeon pea dal', 'grain', 'kg'],
  ['ছোলা', 'Chickpeas', 'grain', 'kg'], ['খেসারি ডাল', 'Grass pea dal', 'grain', 'kg'], ['সেমাই', 'Vermicelli', 'grain', 'pk'], ['নুডলস', 'Noodles', 'grain', 'pk'], ['পাউরুটি', 'Bread', 'grain', 'pk'],
  // মাছ, মাংস ও ডিম
  ['রুই মাছ', 'Rohu fish', 'fish', 'kg'], ['কাতলা মাছ', 'Catla fish', 'fish', 'kg'], ['ইলিশ মাছ', 'Hilsa', 'fish', 'kg'], ['তেলাপিয়া', 'Tilapia', 'fish', 'kg'], ['পাঙ্গাস', 'Pangas', 'fish', 'kg'], ['চিংড়ি', 'Prawn', 'fish', 'kg'],
  ['ছোট মাছ', 'Small fish', 'fish', 'kg'], ['শুঁটকি', 'Dried fish', 'fish', 'g'], ['ব্রয়লার মুরগি', 'Broiler chicken', 'fish', 'kg'], ['দেশি মুরগি', 'Local chicken', 'fish', 'kg'], ['গরুর মাংস', 'Beef', 'fish', 'kg'],
  ['খাসির মাংস', 'Mutton', 'fish', 'kg'], ['মুরগির ডিম', 'Chicken eggs', 'fish', 'dz'], ['হাঁসের ডিম', 'Duck eggs', 'fish', 'hl'],
  // শাকসবজি
  ['আলু', 'Potato', 'veg', 'kg'], ['পেঁয়াজ', 'Onion', 'veg', 'kg'], ['রসুন', 'Garlic', 'veg', 'kg'], ['আদা', 'Ginger', 'veg', 'kg'], ['কাঁচা মরিচ', 'Green chilli', 'veg', 'g'], ['টমেটো', 'Tomato', 'veg', 'kg'],
  ['বেগুন', 'Brinjal', 'veg', 'kg'], ['ফুলকপি', 'Cauliflower', 'veg', 'pcs'], ['বাঁধাকপি', 'Cabbage', 'veg', 'pcs'], ['লাউ', 'Bottle gourd', 'veg', 'pcs'], ['মিষ্টি কুমড়া', 'Pumpkin', 'veg', 'kg'],
  ['পটল', 'Pointed gourd', 'veg', 'kg'], ['ঝিঙা', 'Ridge gourd', 'veg', 'kg'], ['করলা', 'Bitter gourd', 'veg', 'kg'], ['ঢেঁড়স', 'Okra', 'veg', 'kg'], ['শসা', 'Cucumber', 'veg', 'kg'], ['গাজর', 'Carrot', 'veg', 'kg'],
  ['মূলা', 'Radish', 'veg', 'kg'], ['শিম', 'Beans', 'veg', 'kg'], ['মটরশুঁটি', 'Green peas', 'veg', 'kg'], ['কাঁচা পেঁপে', 'Raw papaya', 'veg', 'kg'], ['কাঁচা কলা', 'Raw banana', 'veg', 'hl'], ['কচু', 'Taro', 'veg', 'kg'],
  ['পালং শাক', 'Spinach', 'veg', 'bn'], ['লাল শাক', 'Red amaranth', 'veg', 'bn'], ['পুঁই শাক', 'Malabar spinach', 'veg', 'bn'], ['ধনেপাতা', 'Coriander leaves', 'veg', 'bn'], ['পুদিনা পাতা', 'Mint', 'veg', 'bn'],
  ['লেবু', 'Lemon', 'veg', 'hl'], ['ক্যাপসিকাম', 'Capsicum', 'veg', 'g'],
  // ফলমূল
  ['কলা', 'Banana', 'fruit', 'hl'], ['আপেল', 'Apple', 'fruit', 'kg'], ['কমলা', 'Orange', 'fruit', 'kg'], ['মাল্টা', 'Malta', 'fruit', 'kg'], ['আঙুর', 'Grapes', 'fruit', 'kg'], ['আম', 'Mango', 'fruit', 'kg'],
  ['পেয়ারা', 'Guava', 'fruit', 'kg'], ['পেঁপে', 'Papaya', 'fruit', 'pcs'], ['তরমুজ', 'Watermelon', 'fruit', 'pcs'], ['আনারস', 'Pineapple', 'fruit', 'pcs'], ['ডালিম', 'Pomegranate', 'fruit', 'kg'], ['খেজুর', 'Dates', 'fruit', 'kg'],
  // দুধ ও দুগ্ধজাত
  ['তরল দুধ', 'Fresh milk', 'dairy', 'l'], ['গুঁড়া দুধ', 'Powder milk', 'dairy', 'pk'], ['দই', 'Yogurt', 'dairy', 'kg'], ['ঘি', 'Ghee', 'dairy', 'g'], ['মাখন', 'Butter', 'dairy', 'pk'], ['পনির', 'Cheese', 'dairy', 'pk'],
  ['কনডেন্সড মিল্ক', 'Condensed milk', 'dairy', 'pk'], ['ক্রিম', 'Cream', 'dairy', 'pk'],
  // তেল, মসলা ও রান্নার উপকরণ
  ['সয়াবিন তেল', 'Soybean oil', 'oil', 'l'], ['সরিষার তেল', 'Mustard oil', 'oil', 'l'], ['লবণ', 'Salt', 'oil', 'kg'], ['চিনি', 'Sugar', 'oil', 'kg'], ['হলুদ গুঁড়া', 'Turmeric powder', 'oil', 'g'],
  ['মরিচ গুঁড়া', 'Chilli powder', 'oil', 'g'], ['ধনিয়া গুঁড়া', 'Coriander powder', 'oil', 'g'], ['জিরা', 'Cumin', 'oil', 'g'], ['গরম মসলা', 'Garam masala', 'oil', 'g'], ['এলাচ', 'Cardamom', 'oil', 'g'],
  ['দারুচিনি', 'Cinnamon', 'oil', 'g'], ['লবঙ্গ', 'Clove', 'oil', 'g'], ['তেজপাতা', 'Bay leaf', 'oil', 'g'], ['কালোজিরা', 'Black cumin', 'oil', 'g'], ['পাঁচফোড়ন', 'Panch phoron', 'oil', 'g'],
  ['শুকনা মরিচ', 'Dried chilli', 'oil', 'g'], ['মেথি', 'Fenugreek', 'oil', 'g'], ['টমেটো সস', 'Tomato sauce', 'oil', 'bt'], ['সয়া সস', 'Soy sauce', 'oil', 'bt'], ['ভিনেগার', 'Vinegar', 'oil', 'bt'],
  ['বেকিং পাউডার', 'Baking powder', 'oil', 'pk'], ['আচার', 'Pickle', 'oil', 'bt'], ['রান্নার মসলার প্যাকেট', 'Ready spice mix', 'oil', 'pk'], ['গুড়', 'Jaggery', 'oil', 'kg'],
  // নাশতা ও পানীয়
  ['চা পাতা', 'Tea leaves', 'snack', 'pk'], ['কফি', 'Coffee', 'snack', 'pk'], ['বিস্কুট', 'Biscuits', 'snack', 'pk'], ['চানাচুর', 'Chanachur', 'snack', 'pk'], ['চিপস', 'Chips', 'snack', 'pk'],
  ['কেক', 'Cake', 'snack', 'pcs'], ['জুস', 'Juice', 'snack', 'bt'], ['কোমল পানীয়', 'Soft drink', 'snack', 'bt'], ['খাবার পানি', 'Drinking water', 'snack', 'bt'], ['হরলিকস', 'Horlicks', 'snack', 'pk'],
  ['মধু', 'Honey', 'snack', 'bt'], ['জ্যাম', 'Jam', 'snack', 'bt'], ['চকলেট', 'Chocolate', 'snack', 'pcs'], ['কর্নফ্লেক্স', 'Cornflakes', 'snack', 'pk'], ['ওটস', 'Oats', 'snack', 'pk'],
  // সাবান, ডিটারজেন্ট ও পরিষ্কার-পরিচ্ছন্নতা
  ['গায়ের সাবান', 'Bath soap', 'clean', 'pcs'], ['ডিটারজেন্ট পাউডার', 'Detergent powder', 'clean', 'pk'], ['তরল ডিটারজেন্ট', 'Liquid detergent', 'clean', 'bt'], ['থালা ধোয়ার লিকুইড', 'Dishwash liquid', 'clean', 'bt'],
  ['ফ্লোর ক্লিনার', 'Floor cleaner', 'clean', 'bt'], ['টয়লেট ক্লিনার', 'Toilet cleaner', 'clean', 'bt'], ['হ্যান্ড ওয়াশ', 'Hand wash', 'clean', 'bt'], ['শ্যাম্পু', 'Shampoo', 'clean', 'bt'],
  ['টুথপেস্ট', 'Toothpaste', 'clean', 'pcs'], ['টুথব্রাশ', 'Toothbrush', 'clean', 'pcs'], ['মশার কয়েল', 'Mosquito coil', 'clean', 'pk'], ['মশার স্প্রে', 'Mosquito spray', 'clean', 'bt'],
  ['স্যানিটারি ন্যাপকিন', 'Sanitary pads', 'clean', 'pk'], ['বাচ্চার ডায়াপার', 'Baby diapers', 'clean', 'pk'], ['বডি লোশন', 'Body lotion', 'clean', 'bt'], ['চুলের তেল', 'Hair oil', 'clean', 'bt'],
  // টিস্যু ও দৈনন্দিন ব্যবহার্য
  ['টিস্যু', 'Tissue', 'tissue', 'pk'], ['টয়লেট টিস্যু', 'Toilet paper', 'tissue', 'pcs'], ['ম্যাচ', 'Matchbox', 'tissue', 'pk'], ['গ্যাস লাইটার', 'Lighter', 'tissue', 'pcs'], ['পলিথিন ব্যাগ', 'Polybags', 'tissue', 'pk'],
  ['অ্যালুমিনিয়াম ফয়েল', 'Aluminium foil', 'tissue', 'pcs'], ['ব্যাটারি', 'Battery', 'tissue', 'pcs'], ['বাল্ব', 'Bulb', 'tissue', 'pcs'], ['মোমবাতি', 'Candle', 'tissue', 'pk'], ['ঝাড়ু', 'Broom', 'tissue', 'pcs'],
];

// দ্রুত শুরুর জন্য তৈরি তালিকা: [নাম, পরিমাণ] (নাম ওপরের তালিকার বাংলা নাম)
const BZ_BUILTIN_TPLS = [
  { id: 'b:monthly', bn: 'মাসের মুদি বাজার', en: 'Monthly grocery stock', items: [['চাল (মিনিকেট)', 25], ['মসুর ডাল', 2], ['মুগ ডাল', 1], ['ছোলা', 1], ['আটা', 2], ['সয়াবিন তেল', 5], ['চিনি', 2], ['লবণ', 2], ['হলুদ গুঁড়া', 200], ['মরিচ গুঁড়া', 200], ['ধনিয়া গুঁড়া', 200], ['জিরা', 100], ['গরম মসলা', 50], ['চা পাতা', 1], ['গুঁড়া দুধ', 2], ['ডিটারজেন্ট পাউডার', 2], ['গায়ের সাবান', 4], ['থালা ধোয়ার লিকুইড', 1], ['টিস্যু', 2], ['টুথপেস্ট', 1]] },
  { id: 'b:weekly', bn: 'সাপ্তাহিক সবজি-মাছ-মাংস', en: 'Weekly veg, fish and meat', items: [['আলু', 2], ['পেঁয়াজ', 2], ['রসুন', 0.25], ['আদা', 0.25], ['কাঁচা মরিচ', 100], ['টমেটো', 1], ['বেগুন', 1], ['পটল', 1], ['শসা', 1], ['ধনেপাতা', 1], ['লেবু', 1], ['রুই মাছ', 1], ['ব্রয়লার মুরগি', 1], ['মুরগির ডিম', 1], ['তরল দুধ', 3]] },
  { id: 'b:daily', bn: 'প্রতিদিনের বাজার', en: 'Everyday essentials', items: [['আলু', 1], ['পেঁয়াজ', 1], ['কাঁচা মরিচ', 50], ['টমেটো', 0.5], ['ধনেপাতা', 1], ['লেবু', 1], ['মুরগির ডিম', 0.5], ['তরল দুধ', 1], ['পাউরুটি', 1]] },
];

const bzUnitName = k => (BZ_UNIT_LABEL[k] || [k, k])[isEN() ? 1 : 0];
const bzCatItemName = c => c[isEN() ? 1 : 0];
// নাম (বাংলা বা English) মিললে ক্যাটালগের পণ্য
function bzCatalogFind(name) {
  const k = String(name || '').trim().toLowerCase();
  return k ? BZ_CATALOG.find(c => c[0].toLowerCase() === k || c[1].toLowerCase() === k) || null : null;
}
