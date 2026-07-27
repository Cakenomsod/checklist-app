# Checkmate

## Positioning

Shared checklists with friends — a warm, collaborative todo app where people plan trips, groceries, study goals, and everyday tasks together. Differentiator: real-time shared lists with friends, calendar, reactions, and reminders — not another solo task manager.

## Users

Friends and small groups (couples, roommates, travel buddies, study partners) who want lightweight shared checklists on phone and desktop. Primary use: create lists, assign tasks, track due dates, react/comment, and stay notified.

## Product principles

- Operate mode: scanability and task completion beat decoration
- Soft pastel accent system for list identity; dark/light theme support
- Brand: Checkmate — DM Sans body, Lora italic display
- Preserve collaborative features (friends, invites, reactions, calendar, notifications)
- Mobile-first for phone; desktop has sidebar + list detail layout

## Constraints

- React + Vite + Firebase Auth/Firestore
- Heavy inline styles in page components (preserve patterns unless extracting tokens)
- Thai + English UI copy may appear; keep labels clear
- Do not break drag-and-drop, auth, or Firestore write paths while polishing UI
