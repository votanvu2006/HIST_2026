# HERITAGEXR STUDIO — MASTER PLAN V22.0 (FINAL ULTIMATE EDITION)

## PART 1: OVERVIEW & STRATEGIC POSITIONING
- **Project Name:** HeritageXR Studio.
- **Competition:** HIST 2026 — Category 1 (Aspiring Founders), Topic 02: Digital Transformation & AI in Tourism.
- **Core Positioning:** A Zero-App WebAR & 360° Spatial platform that turns smartphone browsers into a Time Machine. It utilizes an automated AI pipeline to generate 100% of the content (Video, Script, Audio) and operates a sustainable B2B2C Phygital commerce funnel.
- **The Problem:** Solves the "15-minute photo-op" bottleneck in Ho Chi Minh City cultural tourism, extending average dwell time to ~56 minutes and activating ancillary spending.
- **Unfair Moat:** A closed-loop SaaS ecosystem: No-code AI generation tool (90 seconds) + Immersive Cinematic FPV experience + Real-world Phygital revenue streams (Physical prints, Digital files, Partner vouchers).

## PART 2: 13 DEFENSE MECHANISMS (THE FORTRESS ARCHITECTURE)
1. **One-Scan Universal Pass & User-Consent Routing:** Visitors scan one QR code at the gate. They can choose "AR Camera Mode" (WebAR) or "3D Studio Catalog Mode" (Input Room IDs/Artifact Codes 01-200).
2. **AR Auto-Fallback (>3s):** If tracking is lost for >3 seconds due to poor lighting, the system seamlessly auto-fallbacks to the 3D Catalog Mode of that specific artifact.
3. **2K-to-4K Progressive Skybox Loading:** Uses 4K WebP 360° images (3-5MB). Loads a 2K layer (~400KB) in <1s for immediate rotation, then quietly streams the 4K texture for retina sharpness.
4. **Hybrid Spatial 360° Architecture:** Prevents "floating 3D human" errors. The 3D artifact is placed on a physical 3D Pedestal in the center, while historical figures/architecture are integrated into the 360° Skybox with Spatial Audio.
5. **Curatorial Gate & Cultural Prompt Templates:**
   - Uses "Cultural Prompt Templates" (standardized Vietnamese architecture/costume prompts) to guide the AI.
   - Mandatory human approval (Curatorial Gate) prevents autonomous publishing, ensuring 0% historical hallucination.
6. **Push-to-Talk & WebRTC Noise Suppression:** Voice queries require Push-to-Talk to filter out the loud museum environment, ensuring the AI only hears the user.
7. **Generate Once, Serve Millions:** The AI Pipeline runs exactly once on the Admin side via Async Queue. Outputs are static files hosted on Cloudflare CDN. **Zero network bottleneck during peak hours** (e.g., 5,000 simultaneous scans).
8. **B2G Concession Bypass & Dynamic Watermark:** Revenue is collected via private souvenir/café concession stands. AI photos are locked by a Dynamic Watermark and unlocked instantly upon successful payment.
9. **Shift Manager POS Override & Print Spooler:**
   - If the payment webhook is delayed, only the Shift Manager can trigger an override.
   - **Mandatory Receipt Upload** into the Audit Log is required to unlock the photo, eliminating 100% of internal fraud.
   - **Print Spooler Integration** connects directly to the concession's existing POS printers (Zero hardware investment).
10. **Client-Side MediaPipe & Motion Guard:** Face-merging is processed 100% on the user's browser (WebAssembly), costing $0 in GPU server fees. A `[Disable Gyro]` button prevents motion sickness.
11. **Room-based Tabs (Elderly UX Optimization):** Instead of typing `#01–#200`, the 3D Catalog is organized by "Exhibition Rooms" (e.g., "Room 1: Ceramics"). Visitors simply tap the room they are standing in to see the artifact list.
12. **Fact-Scoped RAG:** The AI Chatbot locks its context to the specific artifact being viewed based on the PDF documents, refusing out-of-scope questions.
13. **iOS Compatibility:** Utilizes MindAR (getUserMedia) to ensure WebAR works seamlessly on iOS Safari without requiring native apps.

## PART 3: B2C USER JOURNEY
- **Activation:** Scan QR at the gate → Choose AR Camera or 3D Catalog (Room-based).
- **2-Tab Interaction:**
  - **Tab 1 (Essential Facts):** View static info, rotate 3D model, toggle X-Ray, listen to AI Audio.
  - **Tab 2 (Immersive Cinematic FPV):** Enter the 360° environment. System auto-plays AI Video (MiniMax) reconstructing the era. Users look around via Gyro, listen to Spatial Audio, and solve Minigames.
- **AI Chatbot:** Floating button, Fact-Scoped RAG, Push-to-Talk.
- **Commerce:** AI Photo Souvenir (45-min Loss Aversion).
  - **Digital HD File (30,000 VND - 98% Margin)**
  - **Phygital Silk Print Package (50,000 VND - 45% Margin)**
  - **F&B/Tour Voucher (-20% Affiliate)**

## PART 4: B2B ADMIN CMS
1. **AI Creator Studio (Editor):** 4-Step Wizard (Upload Photos → AI 3D Generation → Upload PDF & Cultural Prompt → Approve & Publish).
2. **Executive Command Center (Manager & Shift POS):** Real-time Telemetry, Revenue Tracking, and POS Manual Override (with Mandatory Receipt Upload).

## PART 5: 4-STATION AI PIPELINE
1. **Station 1 (Script & RAG):** Gemini 1.5 Pro (Parses PDF, generates script & RAG context).
2. **Station 2 (Environment):** Blockade Labs (Renders 4K Skybox).
3. **Station 3 & 3.5 (3D & Video):** Tripo3D (Generates 3D Mesh) + MiniMax (Generates AI Video reconstruction).
4. **Station 4 (Audio):** ElevenLabs (Generates multi-lingual Spatial Audio).
*(All outputs are packaged into static assets and deployed to CDN).*
