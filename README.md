# Checklist App

แอปจัดการ Todo List พร้อมระบบเพื่อน ปฏิทิน และการแจ้งเตือน

**Live:** https://todolistpkbell.web.app/

## ความต้องการของระบบ

- Node.js 20+ (แนะนำ LTS)
- npm
- บัญชี Firebase ที่มีสิทธิ์เข้าถึงโปรเจกต์ `todolistpkbell`

## ติดตั้งครั้งแรก

```bash
# ติดตั้ง dependencies ฝั่ง frontend
npm install

# ติดตั้ง dependencies ฝั่ง Cloud Functions
cd functions && npm install && cd ..
```

## พัฒนา (แก้ไขและรัน)

```bash
npm run dev
```

เปิดเบราว์เซอร์ที่ http://localhost:5173/

## Build

```bash
npm run build
```

ไฟล์ production จะอยู่ในโฟลเดอร์ `dist/`

## Deploy ไป Firebase

ต้อง login Firebase ก่อน (ครั้งแรกเท่านั้น):

```bash
npx firebase login
```

### Deploy ทั้งหมด (Hosting + Functions)

```bash
npm run deploy
```

### Deploy เฉพาะ Hosting (frontend)

```bash
npm run deploy:hosting
```

### Deploy เฉพาะ Cloud Functions

```bash
npm run deploy:functions
```

## โครงสร้างโปรเจกต์

```
checklist-app/
├── src/                  # React frontend (Vite)
│   ├── App/              # หน้าหลักและ components
│   └── firebase.js       # Firebase config
├── functions/            # Firebase Cloud Functions
├── public/               # Static files + service worker
├── firebase.json         # Firebase config
└── .firebaserc           # Firebase project ID
```

## Firebase Project

- **Project ID:** `todolistpkbell`
- **Hosting URL:** https://todolistpkbell.web.app/

## คำสั่งที่มีให้ใช้

| คำสั่ง | คำอธิบาย |
|--------|----------|
| `npm run dev` | รัน dev server |
| `npm run build` | Build สำหรับ production |
| `npm run preview` | ดู preview ของ build |
| `npm run lint` | ตรวจสอบ code ด้วย ESLint |
| `npm run deploy` | Build + deploy ทั้งหมด |
| `npm run deploy:hosting` | Build + deploy frontend |
| `npm run deploy:functions` | Deploy Cloud Functions |
