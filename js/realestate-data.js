'use strict';

/* =========================================================
   Shopno Bilash Properties ওয়েবসাইট থেকে নেওয়া ডেটা (শুধু-পড়া এক্সপোর্ট, 2026-10-22)।
   ওয়েবসাইটের ডেটাবেসে এখন মূলত নমুনা (sample) রেকর্ড আছে, তাই ওগুলোতে sample: true। রিয়েল ডেটা এখান থেকে সরানো যাবে "আরও" থেকে।
   ক্রেতা/ঠিকাদারের নাম ওয়েবসাইট ডেটাবেসে আর নেই (মুছে ফেলা), তাই name খালি রাখা হয়েছে, অ্যাপে বসিয়ে নিন।
   ========================================================= */

const RE_WEB_SEED = {
 "schema": 1,
 "exportedAt": "2026-10-22",
 "company": {
  "name": "Shopno Bilash Properties",
  "legal": "Shopno Bilash Properties Ltd.",
  "phone": "8801313667726",
  "whatsapp": "8801313667726",
  "email": "afrinr461@gmail.com",
  "address": "Rampura Bou Bazar",
  "hours": "10 AM - 10:01 AM"
 },
 "projects": [
  {
   "id": "ba35dc5a-ffbe-4819-8058-9b97e6441b99",
   "name": "Meridian Residences",
   "slug": "meridian-residences",
   "location": "Bashundhara R/A, Dhaka",
   "city": "Dhaka",
   "area": "1.1 Bigha (approx. 40,000 sqft land)",
   "status": "ongoing",
   "type": "Residential",
   "buildingType": "Residential Tower",
   "floors": 12,
   "totalUnits": 24,
   "availableUnits": 16,
   "completionYear": 2027,
   "parkCar": 20,
   "parkBike": 30,
   "desc": "A 12-storey residential tower in Bashundhara R/A offering spacious 3 & 4-bedroom apartments and a duplex penthouse, with rooftop amenities and dedicated parking.",
   "features": [
    "Rooftop Garden & Community Lounge",
    "24/7 Security with CCTV",
    "Backup Generator (Full Building Load)",
    "Dedicated Car & Bike Parking",
    "Central Gas Line Connection",
    "High-Speed Passenger Elevators",
    "Landscaped Green Courtyard",
    "Children's Play Area"
   ],
   "nearby": [
    "Bashundhara City Shopping Mall (10 min drive)",
    "United Hospital (8 min drive)",
    "North South University (5 min drive)",
    "Jamuna Future Park (12 min drive)"
   ],
   "sample": true,
   "src": "web"
  }
 ],
 "units": [
  {
   "id": "dae757c9-6a22-4ac3-ada2-a195aac7b16a",
   "projectId": "ba35dc5a-ffbe-4819-8058-9b97e6441b99",
   "number": "A-501",
   "name": "Unit A-501",
   "floor": 5,
   "sqft": 1850,
   "price": 16800000,
   "status": "available",
   "type": "3 Bed",
   "beds": 3,
   "baths": 3,
   "parking": 1,
   "facing": "South-East",
   "sample": true,
   "src": "web"
  },
  {
   "id": "9fa9fa71-52ed-4d68-9061-8e9161afa355",
   "projectId": "ba35dc5a-ffbe-4819-8058-9b97e6441b99",
   "number": "C-1001",
   "name": "Unit C-1001 (4 Bed Corner)",
   "floor": 10,
   "sqft": 2450,
   "price": 23850000,
   "status": "booked",
   "type": "4 Bed",
   "beds": 4,
   "baths": 4,
   "parking": 2,
   "facing": "South",
   "sample": true,
   "src": "web"
  },
  {
   "id": "93c57511-f907-4c9f-a688-46d851231c00",
   "projectId": "ba35dc5a-ffbe-4819-8058-9b97e6441b99",
   "number": "D-1201",
   "name": "Unit D-1201 (Duplex Penthouse)",
   "floor": 12,
   "sqft": 3600,
   "price": 43500000,
   "status": "sold",
   "type": "Duplex Penthouse",
   "beds": 5,
   "baths": 5,
   "parking": 2,
   "facing": "South-East",
   "sample": true,
   "src": "web"
  },
  {
   "id": "0b4b3e46-ab95-4a4a-86cd-c7048ae26fb2",
   "projectId": "ba35dc5a-ffbe-4819-8058-9b97e6441b99",
   "number": "B-302",
   "name": "Unit B-302",
   "floor": 3,
   "sqft": 1780,
   "price": 16050000,
   "status": "available",
   "type": "3 Bed",
   "beds": 3,
   "baths": 3,
   "parking": 1,
   "facing": "North-East",
   "sample": true,
   "src": "web"
  }
 ],
 "customers": [
  {
   "id": "8da8c80c-78ff-474b-8906-75e83e7ef1d1",
   "name": "",
   "no": 1,
   "phone": "",
   "note": "",
   "sample": true,
   "src": "web"
  },
  {
   "id": "dfc446ee-353c-4c6b-b3ff-0f959cd20398",
   "name": "",
   "no": 2,
   "phone": "",
   "note": "",
   "sample": true,
   "src": "web"
  }
 ],
 "contractors": [
  {
   "id": "68596c1c-dbd4-41d0-93c0-6e6d0e8890cc",
   "name": "",
   "phone": "",
   "sample": true,
   "src": "web"
  }
 ],
 "sales": [
  {
   "id": "83b46e85-51f4-4026-8397-02407836bbd0",
   "projectId": "ba35dc5a-ffbe-4819-8058-9b97e6441b99",
   "unitId": "",
   "webUnitId": "e3d16207-e066-4d2e-8fd0-15a702b151de",
   "sqft": 2100,
   "customerId": "8da8c80c-78ff-474b-8906-75e83e7ef1d1",
   "date": "2025-11-15",
   "base": 19500000,
   "parking": 300000,
   "premium": 0,
   "extra": 200000,
   "discount": 300000,
   "discountReason": "Early-bird booking discount",
   "price": 19700000,
   "terms": "20% down payment, balance in 18 monthly installments",
   "status": "completed",
   "sample": true,
   "src": "web"
  },
  {
   "id": "21d5888c-260a-4d92-947f-f7b813761bb9",
   "projectId": "ba35dc5a-ffbe-4819-8058-9b97e6441b99",
   "unitId": "93c57511-f907-4c9f-a688-46d851231c00",
   "webUnitId": "a1883a8a-5d30-49fb-a5c5-4c2da36311e8",
   "sqft": 3600,
   "customerId": "dfc446ee-353c-4c6b-b3ff-0f959cd20398",
   "date": "2026-02-10",
   "base": 42000000,
   "parking": 400000,
   "premium": 800000,
   "extra": 300000,
   "discount": 0,
   "discountReason": "",
   "price": 43500000,
   "terms": "35% down payment, balance in 24 monthly installments",
   "status": "completed",
   "sample": true,
   "src": "web"
  }
 ],
 "bookings": [
  {
   "id": "f56a30c0-c4e4-4741-ad61-2703b6d70bae",
   "projectId": "ba35dc5a-ffbe-4819-8058-9b97e6441b99",
   "unitId": "9fa9fa71-52ed-4d68-9061-8e9161afa355",
   "customerId": "dfc446ee-353c-4c6b-b3ff-0f959cd20398",
   "ref": "BOOK-MER-C1001",
   "date": "2026-06-01",
   "deposit": 1000000,
   "agreed": 23850000,
   "terms": "20% down payment, balance in 12 monthly installments",
   "status": "booked",
   "sample": true,
   "src": "web"
  }
 ],
 "costs": [
  {
   "id": "93ef8244-077f-426d-9234-18d4174f2535",
   "projectId": "ba35dc5a-ffbe-4819-8058-9b97e6441b99",
   "date": "2024-09-20",
   "title": "Foundation works — final bill",
   "category": "contractor",
   "amount": 22000000,
   "contractorId": "68596c1c-dbd4-41d0-93c0-6e6d0e8890cc",
   "method": "bank-transfer",
   "status": "completed",
   "sample": true,
   "src": "web"
  },
  {
   "id": "f67dba80-8619-4340-9234-d024ccac0427",
   "projectId": "ba35dc5a-ffbe-4819-8058-9b97e6441b99",
   "date": "2026-06-15",
   "title": "Superstructure — running bill through 7th floor",
   "category": "contractor",
   "amount": 38000000,
   "contractorId": "68596c1c-dbd4-41d0-93c0-6e6d0e8890cc",
   "method": "bank-transfer",
   "status": "verified",
   "sample": true,
   "src": "web"
  }
 ],
 "shares": [
  {
   "id": "8a740748-2879-493b-be96-d8cc22831da8",
   "projectId": "ba35dc5a-ffbe-4819-8058-9b97e6441b99",
   "title": "Piling & Foundation Works — Phase 1",
   "category": "piling",
   "total": 3000000,
   "date": "2025-01-15",
   "due": "2025-03-15",
   "fineType": "percentage",
   "fineValue": 5,
   "status": "generated",
   "parts": [
    {
     "id": "b295e95f-7c0d-43d5-868a-1b3884f20de2",
     "customerId": "8da8c80c-78ff-474b-8906-75e83e7ef1d1",
     "unitId": "",
     "sqft": 2100,
     "payable": 1105263
    },
    {
     "id": "0f9893f4-f987-49b5-9359-c52993fec0db",
     "customerId": "dfc446ee-353c-4c6b-b3ff-0f959cd20398",
     "unitId": "",
     "sqft": 3600,
     "payable": 1894737
    }
   ],
   "sample": true,
   "src": "web"
  }
 ],
 "pays": [
  {
   "id": "c69b0343-edbe-4b98-9a09-3b6d1ed48ffc",
   "kind": "share",
   "ref": "b295e95f-7c0d-43d5-868a-1b3884f20de2",
   "date": "2025-02-01",
   "amt": 600000,
   "method": "bank-transfer",
   "note": "Partial payment",
   "sample": true,
   "src": "web"
  },
  {
   "id": "7dd5829f-ac64-4c5c-bf6e-bcbb6beb6b2e",
   "kind": "share",
   "ref": "0f9893f4-f987-49b5-9359-c52993fec0db",
   "date": "2025-02-20",
   "amt": 1894737,
   "method": "bank-transfer",
   "note": "Paid in full",
   "sample": true,
   "src": "web"
  }
 ],
 "web": {
  "policies": [
   {
    "id": "a9081fb6-90af-4196-8d2f-30fcae4b677f",
    "title": "Pricing & Availability",
    "text": "All unit prices, floor plans, and availability published on this website are indicative and **subject to change without prior notice**. The final price and terms for any unit are only those confirmed in a signed sale agreement between the customer and Shopno Bilash Properties Ltd."
   },
   {
    "id": "cbf90a50-7dc3-4c90-8320-f050bc619ce1",
    "title": "Booking & Payment",
    "text": "A unit is only reserved once the applicable booking amount has been received and acknowledged in writing.\n\n- Payment schedules (down payment, installments, and due dates) are set out individually in each customer's sale agreement.\n- All payments should be made through the official channels listed on this website or provided directly by our sales team — **Shopno Bilash Properties Ltd. is not responsible for payments made to any unofficial or unverified account.**"
   },
   {
    "id": "81b278d1-a30c-42d0-b389-866ab5a5e05a",
    "title": "Cancellations & Refunds",
    "text": "Cancellation and refund terms depend on the stage of the booking/sale and are governed by the specific terms agreed in the customer's booking form or sale agreement, not by this website alone. Customers are encouraged to review their agreement or contact us directly before assuming a particular refund outcome."
   },
   {
    "id": "09c404b9-e508-4109-a549-ce13ebb56edd",
    "title": "Handover & Possession",
    "text": "Estimated completion and handover dates shown for a project are **planning estimates, not guaranteed dates** — construction timelines can be affected by permitting, weather, material availability, and other factors outside our direct control. Customers will be kept informed of material changes to a project's expected timeline."
   },
   {
    "id": "5ab2a99e-f016-4f20-a4a7-64bce3c0d850",
    "title": "Communication & Enquiries",
    "text": "For the most accurate, up-to-date information about a specific unit, project, or agreement, please contact Shopno Bilash Properties Ltd. directly rather than relying solely on this website.\n\n- Enquiry form: use the Enquire page on this website.\n- Phone/Email/WhatsApp: see the contact details in the site footer."
   },
   {
    "id": "1c35dba3-fc4d-4571-884b-3d1e2a0e2785",
    "title": "Governing Law & Disputes",
    "text": "These policies, and any agreement entered into with Shopno Bilash Properties Ltd., are governed by the laws of Bangladesh. Any dispute arising from a transaction with us will first be addressed through direct, good-faith discussion between the parties before any other course of action."
   },
   {
    "id": "be279396-5920-4d7c-98f2-a27d8612d091",
    "title": "Changes to This Policy",
    "text": "This Company Policy page may be updated from time to time to reflect changes in our practices or legal requirements. The version published on this website at any given time is the current, effective version."
   }
  ],
  "team": [
   {
    "id": "c4418618-852b-49cc-80c7-e7ffb2a33993",
    "name": "Akibur Rahman",
    "title": "Partner & Director of Technology"
   },
   {
    "id": "fec9b6ca-16bd-4335-9fe6-6ca7fc5dbfa1",
    "name": "Rashedul Karim",
    "title": "Partner & Director of Sales"
   },
   {
    "id": "97624707-d332-49fa-ac8d-64ce350c4fdc",
    "name": "Nusrat Jahan",
    "title": "Head of Finance"
   }
  ],
  "milestones": [
   {
    "id": "4bbc05f0-c9e7-4817-b729-fc6480d10ae8",
    "year": "2016",
    "title": "Company Founded",
    "summary": "Started with a single residential project and a small in-house team."
   },
   {
    "id": "eccea305-db7e-4904-b89e-955c910e76b6",
    "year": "2019",
    "title": "First Handover",
    "summary": "Delivered our first completed development to its residents."
   },
   {
    "id": "61f7a556-8afa-4473-8e2b-e718c77aace3",
    "year": "2022",
    "title": "First Landowner Partnership",
    "summary": "Structured our first joint-venture development on landowner-held land."
   },
   {
    "id": "132c4875-b59d-4ca7-a7ea-e4790c8bf245",
    "year": "2026",
    "title": "Ongoing Growth",
    "summary": "Multiple developments now in planning, construction and delivery at once."
   }
  ],
  "founder": {
   "name": "Anisur Rahman Sajal",
   "title": "Founder & Managing Director"
  },
  "audit": {
   "note": "sample project/unit/customer/payment records were deleted on the website",
   "deleted": 29
  }
 }
};
