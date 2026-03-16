# SN.Fitnex — Gym Management Web App

A lightweight web application to manage gym members, track attendance, and generate reports.

The system is designed so that only the **admin can access the dashboard**, while members can mark attendance easily using a **single QR code system**.

---

# Features

• Admin authentication using Firebase  
• Add, edit, and manage gym members  
• Member profile photo upload via Cloudinary  
• QR-based attendance system  
• Automatic plan expiry detection  
• Attendance tracking and reporting  
• Export attendance reports (CSV / Excel)  
• Download member admission details as PDF  

---

# Services Used

| Service | Purpose | Cost |
|---|---|---|
| Firebase Authentication | Admin login & session handling | Free tier |
| Firestore Database | Members & attendance data | Free tier |
| Cloudinary | Member photo uploads | Free tier (25GB) |
| Vercel | Web app hosting | Free tier |

---

# Project Structure
```
snfitness/
│
├── index.html
├── dashboard.html
├── members.html
├── add-member.html
├── scanner.html
├── reports.html
├── style.css
├── logo.jpeg
│
└── js/
    ├── firebase-config.js
    ├── cloudinary-config.js
    └── app.js
```

# System Flow

1. Admin logs into the web app.
2. Admin adds gym members with:
   - Name
   - Photo
   - Phone number
   - Admission date
   - Plan expiry date

3. A **single QR code** is placed at the gym entrance.

4. Members scan the QR code using their mobile phone.

5. The QR code opens the **attendance page**.

6. Member enters their **phone number**.

7. The system checks the database:

• If plan is **active** → attendance is marked  
• If plan is **expired** → renewal message appears  
• If phone number **not found** → member not registered

---