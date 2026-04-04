# Ski Trip Planner — Product Requirements Specification

**Version:** 1.0
**Date:** April 3, 2026
**Status:** Ready

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack Recommendation](#2-tech-stack-recommendation)
3. [User Roles and Permissions](#3-user-roles-and-permissions)
4. [Data Models](#4-data-models)
5. [Core Feature Set](#5-core-feature-set)
6. [Page and Screen Breakdown](#6-page-and-screen-breakdown)
7. [User Flows](#7-user-flows)
8. [Email and Notification Flows](#8-email-and-notification-flows)
9. [Admin Features](#9-admin-features)
10. [Nice-to-Have Features](#10-nice-to-have-features)
11. [Edge Cases and Business Rules](#11-edge-cases-and-business-rules)
12. [Non-Functional Requirements](#12-non-functional-requirements)

---

## 1. Project Overview

### 1.1 Purpose

A web application for organizing group ski trips end-to-end. An organizer can create a trip, invite a large group of people via email, collect interest responses, confirm the attendee list, and manage all trip details through completion. Past trips are archived and browsable.

### 1.2 Goals

- Eliminate the chaos of coordinating group ski trips over text chains, spreadsheets, and email threads.
- Provide a single source of truth for trip details, attendee lists, and logistics.
- Make it easy for participants to express interest, confirm attendance, and stay informed.
- Preserve historical trip records so the group can look back on past trips.

### 1.3 Non-Goals (v1)

- Native mobile apps (responsive web only)
- Real-time chat/messaging within the app
- Direct payment processing (expense tracking only, no payment gateway)
- Integration with ski resort ticketing systems

---

## 2. Tech Stack Recommendation

### 2.1 Frontend

**Framework: React (with Next.js)**

Rationale:
- Next.js provides file-system routing, server-side rendering, and API routes in a single framework, reducing the need for a separate backend server for most use cases.
- The App Router (Next.js 13+) supports both static and dynamic rendering per page, which is ideal for a mix of public trip pages and authenticated admin views.
- React has the largest ecosystem, making it straightforward to find libraries for email previews, form handling, and data tables.
- TypeScript should be used throughout for type safety across data models.

Supporting libraries:
- **TanStack Query (React Query)** — server state management and caching
- **React Hook Form + Zod** — form handling and schema validation
- **Tailwind CSS** — utility-first styling for rapid, consistent UI development
- **shadcn/ui** — accessible, unstyled component primitives built on Radix UI
- **date-fns** — date manipulation (trip dates, deadlines, duration calculations)
- **Resend** — transactional email delivery (see Section 8)

### 2.2 Backend

**Next.js API Routes / Route Handlers**

For v1, Next.js route handlers cover all API needs without deploying a separate server. If the application grows significantly (e.g., background job processing, complex queuing), the backend can be extracted into a standalone Node.js/Express or Fastify service.

**Authentication: NextAuth.js (Auth.js v5)**

- Supports magic link (passwordless) email login — appropriate since many participants will be one-time or infrequent users who should not be forced to create passwords.
- Supports OAuth providers (Google) as an optional convenience login for frequent users.
- Session management via JWT or database sessions (database sessions recommended for revocation support).

### 2.3 Database

**Primary Database: PostgreSQL (hosted on Supabase or Neon)**

Rationale:
- Relational data (trips, users, attendees, expenses, responses) maps naturally to SQL.
- PostgreSQL's JSONB columns allow flexible storage of trip-specific metadata without over-engineering the schema upfront.
- Supabase provides PostgreSQL with a generous free tier, built-in row-level security, and a dashboard for direct data inspection during development.
- Neon is a strong alternative with serverless connection pooling, ideal if deploying on Vercel.

**ORM: Prisma**

- Type-safe query builder that auto-generates TypeScript types from the schema.
- Migrations are straightforward and version-controlled.
- Works seamlessly with Next.js and both Supabase and Neon connection strings.

### 2.4 Deployment

- **Vercel** — zero-config deployment for Next.js, automatic preview deployments per pull request, edge functions available.
- **Database** — Supabase or Neon (as above), both integrate cleanly with Vercel environment variables.
- **Email** — Resend for transactional email; supports custom domains, delivery tracking, and React Email templates.
- **File Storage** — Supabase Storage or Cloudinary for trip photos (nice-to-have).

### 2.5 Summary Table

| Layer | Choice | Alternative |
|---|---|---|
| Frontend Framework | Next.js (React, TypeScript) | Remix |
| Styling | Tailwind CSS + shadcn/ui | CSS Modules |
| Forms | React Hook Form + Zod | Formik |
| Server State | TanStack Query | SWR |
| Authentication | Auth.js v5 (NextAuth) | Clerk |
| Backend | Next.js Route Handlers | Fastify (separate service) |
| ORM | Prisma | Drizzle ORM |
| Database | PostgreSQL (Neon) | PostgreSQL (Supabase) |
| Email | Resend + React Email | SendGrid |
| Deployment | Vercel | Railway |

---

## 3. User Roles and Permissions

### 3.1 Role Definitions

#### Organizer (Admin)
The person who creates and manages a trip. There can be multiple organizers per trip (co-organizers). Organizers have full control over the trip they manage.

Permissions:
- Create, edit, and delete trips
- Send and resend interest invitations
- View all interest responses
- Approve or reject participants (if using capacity limits or waitlists)
- Confirm the attendee list and move the trip through status stages
- Add/edit/delete trip details (resort, dates, lodging, cost estimates)
- Mark a trip as completed
- Export attendee lists and expense summaries
- Add co-organizers to a trip
- Remove participants from a trip

#### Participant
Someone who has been invited to and confirmed for a trip.

Permissions:
- View full trip details for trips they are confirmed on
- Update their own attendance status (confirm → withdraw)
- Add and view their own expenses
- View the shared expense summary for their trip
- Update their own profile (name, phone) and their per-trip logistics (rental needs, skill level, ski days, travel mode, school year, sleeping preference, comments)

#### Invitee (Interest Responder)
Someone who has received an invitation link but has not yet been confirmed as a participant.

Permissions:
- View a limited, public-facing trip summary (resort, approximate dates, cost range)
- Submit or update their interest response form
- Withdraw their interest

#### Unauthenticated / Public
- View public trip summary pages (if the organizer enables public visibility)
- Submit an interest form via a shared invite link (no account required)

### 3.2 Authentication Model

- Interest form submission does not require an account. The form captures email address and stores the response linked to that email.
- When an invitee is confirmed as a participant, they receive an email with a magic link to set up their account (or sign in via Google).
- Organizers must have a full account.
- A single user account can be both an organizer (for trips they created) and a participant (for trips they were invited to).

---

## 4. Data Models

### 4.1 User

```
User {
  id                String        (UUID, PK)
  email             String        (unique)
  name              String
  phone             String?
  avatarUrl         String?
  role              GlobalRole    (ADMIN | USER) — site-wide role, not per-trip
  createdAt         DateTime
  updatedAt         DateTime

  // Relations
  organizedTrips    TripOrganizer[]
  tripMemberships   TripMember[]
  interestResponses InterestResponse[]
  expenses          Expense[]
}
```

Notes:
- `GlobalRole` of ADMIN is for site administrators (e.g., the app owner). Per-trip organizer status is tracked in `TripOrganizer`.
- Phone is optional but encouraged for trip communication.

### 4.2 Trip

```
Trip {
  id                String        (UUID, PK)
  slug              String        (unique, URL-friendly, e.g., "tahoe-2027-feb")
  name              String        (e.g., "Tahoe Presidents' Weekend 2027")
  status            TripStatus    (DRAFT | INVITING | CONFIRMED | IN_PROGRESS | COMPLETED | CANCELLED)
  visibility        Visibility    (PRIVATE | LINK_ONLY | PUBLIC)

  // Location
  resort            String
  state             String?
  country           String        (default "US")
  resortWebsite     String?

  // Dates
  startDate         Date
  endDate           Date
  inviteDeadline    DateTime?     (deadline for interest form submissions)
  confirmDeadline   DateTime?     (deadline for confirmed participants to pay/commit)

  // Lodging
  selectedHouseId   String?       (FK → PotentialHouse — the chosen listing; null until organizer selects one)
  lodgingCheckIn    DateTime?
  lodgingCheckOut   DateTime?
  lodgingNotes      String?       (WYSIWYG/Markdown)

  // Capacity
  capacityMin       Int?          (minimum to make the trip viable)
  capacityMax       Int?          (hard cap on confirmed participants)

  // Cost
  estimatedCostMin  Decimal?
  estimatedCostMax  Decimal?
  depositFloor      Decimal?      (required deposit amount for a floor spot)
  depositBed        Decimal?      (required deposit amount for a bed spot)
  currency          String        (default "USD")
  costNotes         String?

  // Meta
  description       String?       (Markdown, shown on trip page)
  tripInfo          String?       (Markdown — freeform logistics info: parking, gear, grocery stores, resort tips, etc.)
  coverImageUrl     String?
  inviteToken       String        (unique, random — used in invite links)
  createdAt         DateTime
  updatedAt         DateTime

  // Relations
  organizers        TripOrganizer[]
  members           TripMember[]
  interestResponses InterestResponse[]
  expenses          Expense[]
  expenseSplits     ExpenseSplit[]
  updates           TripUpdate[]
  photos            TripPhoto[]
  potentialHouses   PotentialHouse[]
}
```

**TripStatus lifecycle:**

```
DRAFT → INVITING → CONFIRMED → IN_PROGRESS → COMPLETED
                ↘              ↘
              CANCELLED      CANCELLED
```

- `DRAFT` — Organizer is building the trip; no invitations sent yet.
- `INVITING` — Interest forms have been sent out; collecting responses.
- `CONFIRMED` — The trip is definitely happening. New participants can still be added but require organizer approval before gaining full access.
- `IN_PROGRESS` — The trip is currently happening (auto-set or manually triggered).
- `COMPLETED` — Trip is over; archived in "Past Trips."
- `CANCELLED` — Trip was cancelled at any stage.

### 4.3 TripOrganizer (join table)

```
TripOrganizer {
  id        String    (UUID, PK)
  tripId    String    (FK → Trip)
  userId    String    (FK → User)
  addedAt   DateTime
  addedBy   String    (FK → User — who granted organizer status)
}
```

### 4.4 InterestResponse

Captures responses from the initial invitation blast. Submitted before the invitee has a confirmed account.

```
InterestResponse {
  id                String              (UUID, PK)
  tripId            String              (FK → Trip)
  userId            String?             (FK → User — populated if they have an account)

  // Captured from the form (for non-account holders)
  email             String
  name              String
  phone             String?

  status            InterestStatus      (PENDING | INTERESTED | NOT_INTERESTED | WAITLISTED | CONFIRMED | WITHDRAWN)
  submittedAt       DateTime
  updatedAt         DateTime

  // Form responses
  guestCount          Int                 (default 1 — "I'm bringing X people including myself")
  rentalNeeds         RentalNeeds         (NONE | SKIS | SNOWBOARD | BOOTS | FULL_PACKAGE)
  skillLevel          SkillLevel          (BEGINNER | INTERMEDIATE | ADVANCED | EXPERT)
  skiDays             Int                 (0–4 — number of days they plan to ski)
  travelMode          TravelMode          (DRIVING | FLYING)
  schoolYear          SchoolYear          (FRESHMAN | SOPHOMORE | JUNIOR | SENIOR | ALUM | OTHER)
  schoolYearOther     String?             (free-text entry when schoolYear = OTHER)
  sleepingPreference  SleepingPreference  (FLOOR | BED)
  comments            String?

  // Organizer notes
  organizerNotes    String?

  // Tracking
  inviteEmailSentAt  DateTime?
  reminderSentAt     DateTime?
  confirmEmailSentAt DateTime?

  // Token for unauthenticated edits
  editToken         String              (unique, random — allows invitee to update their response without logging in)
}
```

**InterestStatus lifecycle:**

```
(invite sent) → PENDING → INTERESTED → CONFIRMED
                       → NOT_INTERESTED
                       → WAITLISTED → CONFIRMED
CONFIRMED → WITHDRAWN
INTERESTED → WITHDRAWN
```

### 4.5 TripMember

Represents a confirmed participant on a trip. Created when an organizer confirms an InterestResponse.

```
TripMember {
  id                  String            (UUID, PK)
  tripId              String            (FK → Trip)
  userId              String            (FK → User)
  interestResponseId  String?           (FK → InterestResponse — traceability)

  role                MemberRole        (PARTICIPANT | ORGANIZER)
  status              MemberStatus      (CONFIRMED | WITHDRAWN | REMOVED)

  confirmedAt         DateTime
  withdrawnAt         DateTime?
  withdrawalReason    String?

  // Per-member logistics (copied from InterestResponse on confirmation, editable by organizer)
  rentalNeeds         RentalNeeds
  skillLevel          SkillLevel
  skiDays             Int               (0–4)
  travelMode          TravelMode        (DRIVING | FLYING)
  schoolYear          SchoolYear        (FRESHMAN | SOPHOMORE | JUNIOR | SENIOR | ALUM | OTHER)
  schoolYearOther     String?
  sleepingPreference  SleepingPreference (FLOOR | BED)
  fullTripAttendance  Boolean           (default true — false if participant is only attending part of the trip)
  tripArrivalDate     Date?             (only set when fullTripAttendance = false)
  tripDepartureDate   Date?             (only set when fullTripAttendance = false)
  roomAssignment      String?           (set by organizer)

  // Payment tracking (manual, not gateway)
  depositAmount       Decimal?          (per-person override; null = use trip-level depositFloor or depositBed based on sleepingPreference)
  depositPaid         Boolean           (default false)
  depositPaidAt       DateTime?
  depositConfirmedBySelf Boolean        (true when participant checked the deposit acknowledgement on the confirmation form)
  balancePaid         Boolean           (default false)
  balancePaidAt       DateTime?
}
```

### 4.6 Expense

```
Expense {
  id              String          (UUID, PK)
  tripId          String          (FK → Trip)
  paidById        String          (FK → User — who paid)
  category        ExpenseCategory (LODGING | LIFT_TICKETS | TRANSPORTATION | FOOD | EQUIPMENT_RENTAL | MISC)
  description     String
  amount          Decimal
  currency        String
  date            Date
  receiptUrl      String?
  notes           String?
  createdAt       DateTime

  // Relations
  splits          ExpenseSplit[]
}
```

### 4.7 ExpenseSplit

```
ExpenseSplit {
  id          String      (UUID, PK)
  expenseId   String      (FK → Expense)
  userId      String      (FK → User)
  share       Decimal     (amount owed by this user for this expense)
  settled     Boolean     (default false)
  settledAt   DateTime?
}
```

### 4.8 TripUpdate

Organizer posts an update/announcement to all confirmed participants.

```
TripUpdate {
  id          String      (UUID, PK)
  tripId      String      (FK → Trip)
  authorId    String      (FK → User)
  title       String
  body        String      (Markdown)
  pinned      Boolean     (default false)
  sentEmail   Boolean     (whether an email notification was sent to participants)
  createdAt   DateTime
  updatedAt   DateTime
}
```

### 4.9 TripPhoto

```
TripPhoto {
  id            String    (UUID, PK)
  tripId        String    (FK → Trip)
  uploadedById  String    (FK → User)
  url           String
  caption       String?
  takenAt       DateTime?
  createdAt     DateTime
}
```

### 4.10 SurveyResponse

Stores a confirmed participant's response to the post-trip survey, sent automatically when a trip moves to COMPLETED.

```
SurveyResponse {
  id                  String    (UUID, PK)
  tripId              String    (FK → Trip)
  tripMemberId        String    (FK → TripMember, unique per trip)
  overallRating       Int       (1–5)
  highlights          String?   (free text — what went well)
  improvements        String?   (free text — what to do differently)
  wouldReturnToResort Boolean?
  wouldReturnToHouse  Boolean?  (only shown if a house was selected for the trip)
  additionalComments  String?
  submittedAt         DateTime
}
```

Notes:
- One record per confirmed participant per trip. The survey link is unique per participant and does not require the participant to be logged in (uses a token similar to `editToken`).
- Responses are visible only to organizers, not to other participants.
- A participant who did not attend the full trip (fullTripAttendance = false) still receives the survey.

### 4.11 TransportationDetail

Filled out by each confirmed participant after they access the trip page. Captures confirmed travel logistics used by the transfer group organizer.

```
TransportationDetail {
  id                      String        (UUID, PK)
  tripId                  String        (FK → Trip)
  tripMemberId            String        (FK → TripMember, unique per trip)

  travelMode              TravelMode    (DRIVING | FLYING)

  // Flying fields (populated when travelMode = FLYING)
  arrivalAirport          String?
  departureSameAsArrival  Boolean?      (default true)
  departureAirport        String?       (only used when departureSameAsArrival = false)
  arrivalTime             DateTime?
  departureTime           DateTime?
  rentingCar              Boolean?

  // Driving fields (populated when travelMode = DRIVING)
  driveRole               DriverRole?   (DRIVER | PASSENGER)
  driveArrivalTime        DateTime?     (DRIVER only)
  driveDepartureTime      DateTime?     (DRIVER only)
  extraSeats              Int?          (DRIVER only — available seats beyond the driver)
  driverTripMemberId      String?       (FK → TripMember — PASSENGER only, links to their driver)

  comments                String?

  createdAt               DateTime
  updatedAt               DateTime
}
```

Notes:
- One record per confirmed participant per trip. The form is accessible after the participant completes the attendance confirmation step.
- `driverTripMemberId` is set when a passenger selects their driver from a dropdown of members who indicated `driveRole = DRIVER`. This is informational and pre-populates the transfer group organizer.

### 4.12 TransferGroup

A virtual car group created by the organizer in the transfer group organizer tool. Used for both the inbound (airport → lodging) and outbound (lodging → airport) legs.

```
TransferGroup {
  id              String            (UUID, PK)
  tripId          String            (FK → Trip)
  direction       TransferDirection (TO_LODGING | TO_AIRPORT)
  name            String            (e.g., "Car 1", "The Blue Subaru")
  driverId        String?           (FK → TripMember — assigned driver)
  maxCapacity     Int?              (organizer-set cap, not counting driver)
  createdAt       DateTime
  updatedAt       DateTime

  // Relations
  assignments     TransferAssignment[]
}
```

### 4.13 TransferAssignment

Tracks which "bucket" each confirmed participant has been placed into for each transfer leg. A participant with no `TransferAssignment` for a given direction is considered unassigned.

```
TransferAssignment {
  id              String                  (UUID, PK)
  tripId          String                  (FK → Trip)
  tripMemberId    String                  (FK → TripMember)
  direction       TransferDirection       (TO_LODGING | TO_AIRPORT)
  type            TransferAssignmentType  (CAR_GROUP | OWN | SHUTTLE)
  transferGroupId String?                 (FK → TransferGroup — only when type = CAR_GROUP)
  assignedAt      DateTime
  assignedBy      String                  (FK → User — organizer who made the assignment)

  @@unique([tripMemberId, direction])     (one assignment per person per direction)
}
```

### 4.14 PotentialHouse

A lodging listing added by an organizer during trip planning. Multiple listings can exist per trip; exactly one can be marked as selected via `Trip.selectedHouseId`.

```
PotentialHouse {
  id                String    (UUID, PK)
  tripId            String    (FK → Trip)
  addedById         String    (FK → User — organizer who added it)
  listingUrl        String    (Airbnb, VRBO, or any URL)
  price             Decimal   (total listing price for the trip duration)
  bedSpots          Int       (number of bed spots available)
  floorSpots        Int       (number of floor spots available)
  pricePerBedSpot   Decimal?  (what each person in a bed spot owes for the house)
  pricePerFloorSpot Decimal?  (what each person in a floor spot owes for the house)
  createdAt         DateTime
  updatedAt         DateTime
}
```

Notes:
- `listingUrl` is used to render the clickable card link and is also used to fetch an OG image/title for the card preview (nice-to-have).
- All fields except `id`, `tripId`, `addedById`, and timestamps are editable by any organizer at any time.
- `pricePerBedSpot` and `pricePerFloorSpot` are organizer-set and independent from `price`. They represent what each individual is charged for their spot, and are used by the house expense generator (F-25).
- When the organizer selects this house, `Trip.selectedHouseId` is set to this record's id. The selected house's `bedSpots` and `floorSpots` become the authoritative capacity figures for the trip. The organizer may still change the selection after the trip reaches CONFIRMED status.
- Deleting a `PotentialHouse` that is currently selected clears `Trip.selectedHouseId`.

### 4.15 Enumerations

```
TripStatus:             DRAFT | INVITING | CONFIRMED | IN_PROGRESS | COMPLETED | CANCELLED
Visibility:             PRIVATE | LINK_ONLY | PUBLIC
InterestStatus:         PENDING | INTERESTED | NOT_INTERESTED | WAITLISTED | CONFIRMED | WITHDRAWN
MemberStatus:           CONFIRMED | WITHDRAWN | REMOVED
MemberRole:             PARTICIPANT | ORGANIZER
RentalNeeds:            NONE | SKIS | SNOWBOARD | BOOTS | FULL_PACKAGE
SkillLevel:             BEGINNER | INTERMEDIATE | ADVANCED | EXPERT
TravelMode:             DRIVING | FLYING
SchoolYear:             FRESHMAN | SOPHOMORE | JUNIOR | SENIOR | ALUM | OTHER
SleepingPreference:     FLOOR | BED
DriverRole:             DRIVER | PASSENGER
TransferDirection:      TO_LODGING | TO_AIRPORT
TransferAssignmentType: CAR_GROUP | OWN | SHUTTLE
ExpenseCategory:        LODGING | LIFT_TICKETS | TRANSPORTATION | FOOD | EQUIPMENT_RENTAL | MISC
GlobalRole:             ADMIN | USER
```

---

## 5. Core Feature Set

### 5.1 Trip Creation and Management

**F-01: Create a Trip**
- Organizer can create a new trip from the dashboard.
- Required fields at creation: name, resort, start date, end date.
- All other fields are optional and can be filled in over time.
- Trip starts in `DRAFT` status.
- A unique `slug` is auto-generated from the trip name and year (e.g., `tahoe-2027-feb`), with collision handling.
- A unique `inviteToken` is generated and never shown publicly; it forms the invite link (`/invite/[inviteToken]`).

**F-02: Edit Trip Details**
- Organizers can edit all trip fields at any status except `COMPLETED` or `CANCELLED`.
- Changes to dates, location, or cost after status reaches `CONFIRMED` trigger an automatic notification email to all confirmed participants.

**F-03: Trip Status Transitions**
- `DRAFT → INVITING`: Triggered when organizer sends the first batch of invitations.
- `INVITING → CONFIRMED`: Manual action by organizer after reviewing interest responses.
- `CONFIRMED → IN_PROGRESS`: Automatic (cron job) when `startDate` is reached, or manual.
- `IN_PROGRESS → COMPLETED`: Automatic when `endDate + 1 day` is reached, or manual.
- Any status → `CANCELLED`: Manual action by organizer; triggers cancellation email to all affected parties.

**F-04: Trip Visibility**
- `PRIVATE`: Only organizers and confirmed members can view the trip page.
- `LINK_ONLY`: Anyone with the invite link can view the public-facing summary and submit an interest form. Trip is not discoverable.
- `PUBLIC`: Trip appears on a public-facing trips listing (useful for open invitations within a club or organization).

**F-05: Co-Organizers**
- An organizer can grant co-organizer status to any confirmed participant or by email.
- Co-organizers have equal permissions to the original organizer except they cannot remove the original organizer.

### 5.2 Invitation and Interest Collection

**F-06: Send Invitations**
- Organizer enters or pastes a list of email addresses (comma-separated or line-delimited) into the invitation sender.
- Organizer can optionally write a custom message that appears in the invite email.
- System sends a personalized invitation email to each address with a link to the interest form: `/invite/[inviteToken]?ref=[editToken]`.
- The `ref` parameter pre-fills the form and allows the invitee to update their response later without logging in.
- Invitees who already have an account are recognized by email and their response is linked automatically.
- Duplicate detection: if an email has already been sent an invitation for this trip, the UI warns the organizer before resending.

**F-07: Interest Form**
- Public-facing form accessible at `/invite/[inviteToken]`.
- If `?ref=[token]` is present and valid, the form pre-fills with the invitee's previous response.
- Fields:
  - Name (required)
  - Email (required)
  - Phone (optional)
  - Interest level: "Yes, I'm in!" / "Maybe, tell me more" / "I can't make it" (maps to INTERESTED / PENDING / NOT_INTERESTED)
  - Number of guests (including self, default 1)
  - Rental needs (dropdown)
  - Skill level (dropdown)
  - Number of ski days (0–4, numeric selector)
  - Travel mode: Drive or Fly (radio)
  - School year (dropdown: Freshman / Sophomore / Junior / Senior / Alum / Other — "Other" reveals a text field)
  - Sleeping preference: Floor or Bed (radio)
  - Comments / questions (text, optional)
- On submission: creates or updates an `InterestResponse`, sends a confirmation email to the invitee.
- If the invitee already submitted and returns via their edit link, they see their previous response and can update it up until the `inviteDeadline`.
- After `inviteDeadline`, the form shows a message that submissions are closed. Organizers can still manually add responses.

**F-08: Waitlist**
- If `capacityMax` is set and the number of INTERESTED responses (summing `guestCount`) reaches the cap, new INTERESTED responses are automatically set to WAITLISTED.
- Organizer can manually move someone from WAITLISTED to CONFIRMED.
- When a confirmed participant withdraws, the next person on the waitlist is notified automatically.

**F-09: Bulk Invite Management**
- Organizer can view all invitations sent, with status for each (sent, opened, responded).
- Organizer can resend the invitation to non-responders as a reminder.
- Organizer can add new email addresses at any time while the trip is in INVITING status.

### 5.3 Attendee Confirmation

**F-10: Confirm Participants**
- Organizer reviews the list of INTERESTED responses and selects who to confirm.
- Confirming an invitee:
  1. Creates a `TripMember` record linked to the `InterestResponse`.
  2. Sends the invitee a confirmation email with a magic link to create/access their account.
  3. Updates `InterestResponse.status` to CONFIRMED.
- Organizer can confirm individuals one at a time or confirm all INTERESTED responders at once.
- If the confirmed invitee does not have an account, one is created with a pending activation state. The magic link activates it.

**F-11: Generate Interested Participants Email List**
- Organizer can, at any time, export or copy a plain-text email list of:
  - All INTERESTED respondents
  - All CONFIRMED members
  - All respondents who said NOT_INTERESTED (for exclusion lists)
- Format: comma-separated emails, or newline-separated, or CSV download with name + email + status.

**F-12: Withdraw / Remove Participants**
- A confirmed participant can withdraw themselves from a trip at any time.
- An organizer can remove a participant.
- Both actions set `TripMember.status` to WITHDRAWN or REMOVED respectively.
- If a capacity max is enforced and someone withdraws/is removed, the first WAITLISTED invitee is automatically emailed.
- A withdrawn participant loses access to the full trip detail page but can still see a summary ("You withdrew from this trip on [date]").

### 5.4 Trip Detail Page

**F-13: Trip Detail Page — Participant View**
Visible to confirmed members (after login) and organizers.

Sections:
- **Header**: Trip name, resort name, dates, cover photo, status badge.
- **Quick Stats**: Number of confirmed attendees, days until trip, estimated cost per person.
- **Details**: Full description, lodging info, check-in/check-out times, resort website link.
- **Trip Info**: Freeform logistics reference content (parking, gear, grocery stores, resort tips, etc.). Organizer-editable Markdown.
- **Attendees**: List of confirmed participants with name, skill level, rental needs, room assignment.
- **Updates**: Pinned and recent organizer announcements.
- **Expenses**: Shared expense tracker (see Section 5.5).
- **Photos**: Gallery (post-trip especially).

**F-14: Trip Detail Page — Public/Invite View**
Visible to anyone with the invite link (if visibility is LINK_ONLY or PUBLIC).

Sections:
- Trip name, resort, approximate dates ("February 2027"), cost range, brief description.
- Number of people interested so far (not specific names for privacy).
- Call to action: "Fill out the interest form."
- Does not show lodging address, attendee names, or expense details.

**F-15: Past Trips Archive**
- A dedicated section of the app showing all trips with status COMPLETED.
- Each past trip shows: name, resort, dates, number of attendees, cover photo.
- Clicking opens the full trip detail page in a read-only mode.
- Participants can browse all past trips they were on (from their profile).

**F-16: Trip Info Page**
- A freeform Markdown page on the trip, editable by any organizer, intended for static logistics content that doesn't belong in time-stamped updates. Examples: parking instructions, recommended gear, nearest grocery store, resort trail map link, house rules, BYOP policy, etc.
- Content is stored in `Trip.tripInfo` and rendered as formatted HTML on the info page.
- Organizer edits the content inline or via a Markdown editor; changes save immediately.
- Visible to all confirmed participants. Not visible on the public/invite view.
- Distinct from Trip Updates (section 4.8), which are time-stamped announcements. Trip Info is evergreen reference material.

### 5.5 Expense Tracking

**F-17: Add Expenses**
- Any confirmed participant or organizer can add an expense.
- Fields: category, description, amount, date, who paid, optional receipt photo.
- The "who paid" field defaults to the logged-in user but can be changed.

**F-18: Expense Splits**
- When adding an expense, the payer can choose:
  - Split equally among all confirmed participants (default)
  - Split among a subset of participants
  - Custom amounts per person
- The system calculates each person's share and stores `ExpenseSplit` records.

**F-19: Settlement Summary**
- The expenses page shows:
  - Total trip expenses
  - Per-person total owed
  - Per-person breakdown by category
  - Who owes whom (net settlement — e.g., "Alex owes Jordan $45 and Sam $20")
- Settlement is tracked manually (organizer or participant marks a split as settled).
- Venmo / payment links are not handled in-app (v1); this is informational only.

### 5.6 Transportation Details

**F-20: Transportation Details Form**
- Accessible to confirmed participants from the trip page after completing the attendance confirmation step.
- One form per participant per trip. If already submitted, the participant sees their saved response and can edit it.
- The form adapts based on travel mode selection:

  **Flying:**
  - Arrival airport (text, required)
  - Departure airport: checkbox "My departure airport is different from my arrival airport." When unchecked, departure airport is assumed to match arrival. When checked, a departure airport field appears (required).
  - Arrival time (date + time picker, required)
  - Departure time (date + time picker, required)
  - Renting a car? (yes / no toggle)
  - Comments (text, optional)

  **Driving:**
  - Role: Driver or Passenger (radio, required)
  - If **Driver**:
    - Arrival time (date + time picker, required)
    - Departure time (date + time picker, required)
    - Extra seats available (numeric, 0+, required — seats beyond the driver's own)
    - Comments (text, optional)
  - If **Passenger**:
    - Driver (dropdown of TripMembers who indicated `driveRole = DRIVER`, optional — can leave blank if unknown)
    - Comments (text, optional)

- Submission creates or updates a `TransportationDetail` record.
- Organizer can view all submitted transportation details on the attendee management page.

### 5.7 Transfer Group Organizer

**F-21: Airport → Lodging Transfer Groups**

Accessible to organizers at `/trips/[slug]/transfers`. Shows two tabs: "Airport → Lodging" and "Lodging → Airport."

**Airport → Lodging tab:**
- Left panel — **Unassigned list**: all confirmed participants who have not been placed in a bucket, sorted by arrival time. Each card shows name, arrival time, and arrival airport.
- Right panel — **Assignment area** containing:
  - One or more **Virtual Car** groups (created by organizer)
  - A **"Getting there on their own"** bucket
  - A **"Shuttle / Public Transit"** bucket

**Virtual Car group behavior:**
- Organizer clicks "Add Car" to create a new group. They name it (e.g., "Car 1") and set an optional max capacity (not counting driver).
- Driver assignment: the organizer assigns a driver from a dropdown filtered to members who indicated `travelMode = DRIVING` + `driveRole = DRIVER`, or `travelMode = FLYING` + `rentingCar = true`. The driver card is visually distinct in the group.
- Organizer drags a participant card from the unassigned list (or another bucket) into the car group. The card is removed from the unassigned list.
- If a car is at max capacity, it shows a visual indicator and blocks additional drops.
- Cars display their current count vs. capacity (e.g., "3 / 5").
- Organizer can drag participants back to the unassigned list or to a different bucket.

**"Getting there on their own" and "Shuttle / Public Transit" buckets:**
- Organizer drags participants into these buckets the same way.
- These buckets have no capacity limit.

**F-22: Lodging → Airport Transfer Groups**

Identical in structure to F-21 but for the outbound leg:
- Unassigned list sorted by departure time. Each card shows name, departure time, and departure airport.
- Same virtual car, own, and shuttle buckets.
- Driver assignment is filtered to the same criteria (DRIVING + DRIVER, or FLYING + renting car).
- The two directions are independent — a participant's assignment in one direction does not affect the other.

**Persistence:**
- All assignments are saved to `TransferAssignment` records in real time as the organizer drags.
- A participant's `driverTripMemberId` (set on their transportation form) pre-populates them into the correct car group if one already exists for that driver; organizer can override.

### 5.8 House Tracker

**F-23: Add and Manage Potential Houses**
- Accessible to organizers from the housing page at `/trips/[slug]/housing`. Available at all trip statuses except COMPLETED and CANCELLED.
- Organizer clicks "Add House" to open a form with the following fields:
  - Listing URL (required — Airbnb, VRBO, or any link)
  - Total price for the trip (required)
  - Bed spots (required, integer ≥ 0)
  - Floor spots (required, integer ≥ 0)
  - Price per bed spot (optional — what each person in a bed owes)
  - Price per floor spot (optional — what each person on the floor owes)
- Submitting creates a `PotentialHouse` record and displays a card in the listing grid.

**F-24: House Listing Cards**
- Each house is displayed as a card containing:
  - A clickable link that opens the listing URL in a new tab (displayed as the URL domain or a truncated title)
  - Total price
  - Bed spots count and price per bed spot (if set)
  - Floor spots count and price per floor spot (if set)
  - Edit button (opens an inline or modal form to update any of the above fields)
  - Delete button (with confirmation prompt; if this house is currently selected, selecting delete clears the selection)
  - "Select this house" button (disabled if already selected)
- The currently selected house card is visually highlighted (e.g., a border or "Selected" badge).

**F-25: Select and Change the House**
- Organizer clicks "Select this house" on any card to set `Trip.selectedHouseId` to that listing.
- Only one house can be selected at a time; selecting a new one deselects the previous.
- The selected house's `bedSpots` and `floorSpots` become the displayed capacity for the trip. The existing `Trip.capacityMax` can optionally be synced to `bedSpots + floorSpots` when a house is selected (organizer prompted to confirm).
- The organizer can change the selected house at any time, including after the trip reaches CONFIRMED or IN_PROGRESS status.
- The selected house's listing URL is shown on the participant-facing trip detail page (lodging section) once the trip is CONFIRMED.

**F-26: Generate House Expense**
- Available on the housing page for the selected house, once at least one participant is confirmed.
- Requires `pricePerBedSpot` and `pricePerFloorSpot` to both be set on the selected house before the button is enabled.
- Organizer clicks "Generate House Expense." A preview modal shows:
  - Each confirmed participant, their sleeping preference, the gross spot price, their deposit already paid, and the resulting net amount owed.
  - Bed spot participants: net = `pricePerBedSpot − depositAlreadyPaid` (using `TripMember.depositAmount` if set, otherwise `Trip.depositBed`).
  - Floor spot participants: net = `pricePerFloorSpot − depositAlreadyPaid` (using `TripMember.depositAmount` if set, otherwise `Trip.depositFloor`).
  - If a participant's deposit equals or exceeds the spot price, their net is shown as $0 (no negative splits).
  - Total house expense and total collected in deposits are shown as a summary.
- Organizer confirms → system creates one `Expense` record (category: LODGING, description: "[House listing title/URL] — lodging", paidBy: organizer) and one `ExpenseSplit` record per confirmed participant set to their net amount.
- If a house expense has already been generated, the button changes to "Regenerate House Expense" with a warning that the previous expense and its splits will be replaced. The organizer must confirm before proceeding.

---

## 6. Page and Screen Breakdown

### 6.1 Public Pages (No Login Required)

| Route | Page | Description |
|---|---|---|
| `/` | Home / Landing | App overview, link to sign in or sign up. If user is logged in, redirect to `/dashboard`. |
| `/trips` | Public Trips Listing | Shows all trips with `visibility = PUBLIC`. |
| `/invite/[inviteToken]` | Interest Form | Public invite page with trip summary and interest form. |
| `/invite/[inviteToken]/submitted` | Submission Confirmation | Thank-you page after submitting the interest form. |

### 6.2 Authenticated Pages (Login Required)

| Route | Page | Description |
|---|---|---|
| `/dashboard` | Dashboard | List of the user's upcoming and past trips, quick actions. |
| `/trips/new` | Create Trip | Multi-step form to create a new trip. |
| `/trips/[slug]` | Trip Detail | Full trip page (participant view). |
| `/trips/[slug]/edit` | Edit Trip | Edit all trip metadata (organizer only). |
| `/trips/[slug]/invitations` | Manage Invitations | Send invites, view responses, confirm participants (organizer only). |
| `/trips/[slug]/attendees` | Attendee Management | View/manage confirmed participants, room assignments (organizer only). |
| `/trips/[slug]/expenses` | Expense Tracker | Add, view, and settle trip expenses. |
| `/trips/[slug]/info` | Trip Info | Freeform logistics reference page, editable by organizers. |
| `/trips/[slug]/housing` | House Tracker | Add, compare, and select potential lodging listings (organizer only). |
| `/trips/[slug]/transportation` | Transportation Details | Participant fills out their travel details (flight/drive info). |
| `/trips/[slug]/transfers` | Transfer Group Organizer | Drag-and-drop airport transfer group builder (organizer only). |
| `/trips/[slug]/updates` | Trip Updates | View and post announcements. |
| `/trips/[slug]/photos` | Photo Gallery | Upload and view trip photos. |
| `/past-trips` | Past Trips Archive | Browse all completed trips. |
| `/profile` | User Profile | Edit name, phone, preferences, connected accounts. |
| `/admin` | Site Admin Panel | Site-wide admin: all users, all trips, email logs (GlobalRole = ADMIN only). |

### 6.3 Navigation Structure

```
Top Nav (logged in):
  Dashboard | My Trips | Past Trips | [User Avatar → Profile / Sign Out]

Trip Sub-Nav (when on a trip page):
  Overview | Attendees | Trip Info | Transportation | Expenses | Updates | Photos | [Housing — organizer only] | [Transfers — organizer only] | [Settings — organizer only]
```

---

## 7. User Flows

### 7.1 Organizer: Create and Launch a Trip

```
1. Sign in to the app.
2. Click "New Trip" from the Dashboard.
3. Complete Step 1 — Basics: name, resort, start/end dates.
4. Complete Step 2 — Details: lodging, cost estimate, description, capacity limits (optional).
5. Complete Step 3 — Settings: visibility, invite deadline, confirm deadline.
6. Review summary → click "Create Trip" → trip created in DRAFT status.
7. From the Trip page, click "Send Invitations."
8. Enter email list (paste a CSV column or comma-separated list).
9. Preview the invite email.
10. Click "Send Invitations" → emails sent → trip moves to INVITING status.
11. Monitor responses on the Invitations page.
12. (Optional) Send reminder to non-responders.
13. When ready, review INTERESTED responses → click "Confirm Selected" or "Confirm All Interested."
14. Trip moves to CONFIRMED status.
15. Confirmed participants receive emails with account activation links.
```

### 7.2 Invitee: Submit Interest

```
1. Receive invitation email.
2. Click "Fill Out the Interest Form" link.
3. View the public trip summary page.
4. Fill out the interest form (name, email, interest level, rental needs, etc.).
5. Submit form → see confirmation page.
6. Receive confirmation email with "Edit your response" link.
7. (Optional) Click edit link to update response before the invite deadline.
```

### 7.3 Invitee: Get Confirmed and Access Trip

```
1. Organizer confirms participant.
2. Participant receives confirmation email: "You're confirmed for [Trip Name]!"
3. Email states the deposit amount due for their spot type (floor or bed) and payment instructions.
4. Email contains a magic link to activate or log into account.
5. Click magic link → lands on an attendance confirmation form before accessing the full trip page.
6. Confirmation form shows:
   - Their sleeping preference (floor or bed)
   - The deposit amount required for that spot type
   - A required checkbox: "I confirm that I have paid the $[X] deposit."
   - A required toggle: "Will you be there for the entire trip?" (default: Yes)
   - If No: arrival date and departure date pickers appear (both required, must fall within the trip's start/end dates)
7. Participant cannot proceed to the trip detail page until the form is submitted.
8. On submission: TripMember.depositConfirmedBySelf is set to true; fullTripAttendance, tripArrivalDate, and tripDepartureDate are saved; organizer is notified to verify payment.
9. Participant lands on the full Trip Detail page.
10. See full details: attendees, lodging address, updates, expense tracker.
```

### 7.4 Participant: Withdraw from a Trip

```
1. Navigate to Trip Detail page.
2. Click "Manage Attendance."
3. See current status: Confirmed.
4. Click "Withdraw from Trip."
5. Confirmation modal: "Are you sure? This may affect your deposit."
6. Optionally provide a withdrawal reason.
7. Click Confirm Withdrawal.
8. Status updates to WITHDRAWN.
9. Organizer is notified via email.
10. If waitlist exists and capacity was at max, next waitlisted person is emailed.
11. Participant sees limited trip view with withdrawal notice.
```

### 7.5 Organizer: Trip Completion

```
1. Trip end date passes → status automatically moves to IN_PROGRESS then COMPLETED.
   (Or organizer manually marks as Completed.)
2. Trip moves to Past Trips section.
3. Expense tracker remains accessible for post-trip settlement.
4. Photo uploads are enabled/encouraged.
5. Trip is read-only except for expenses and photos.
```

---

## 8. Email and Notification Flows

All transactional emails are sent via Resend with React Email templates.

### 8.1 Email Templates Required

| ID | Trigger | Recipient | Subject |
|---|---|---|---|
| E-01 | Organizer sends invitations | Each invited email | "You're invited to [Trip Name]!" |
| E-02 | Invitee submits interest form | Invitee | "Thanks for your interest in [Trip Name]" |
| E-03 | Organizer sends reminder | Non-responders | "Reminder: Interest form for [Trip Name] closes soon" |
| E-04 | Organizer confirms participant | Invitee | "You're confirmed for [Trip Name]!" |
| E-05 | Participant withdraws | Organizer(s) | "[Name] has withdrawn from [Trip Name]" |
| E-06 | Waitlisted person is next in line | Waitlisted invitee | "A spot opened up on [Trip Name]!" |
| E-07 | Trip details change (post-confirm) | All confirmed participants | "Update: [Trip Name] details have changed" |
| E-08 | Organizer posts a Trip Update | All confirmed participants (optional) | "[Trip Name]: [Update Title]" |
| E-09 | Trip is cancelled | All interested + confirmed | "[Trip Name] has been cancelled" |
| E-10 | Magic link / account activation | New confirmed participant | "Access your [Trip Name] trip page" |
| E-11 | Invite deadline approaching | INTERESTED (not yet confirmed) | "Last chance: [Trip Name] interest form closes in 48 hours" |
| E-12 | Trip is starting soon | All confirmed participants | "[Trip Name] is almost here — here's everything you need" |

### 8.2 Email Content Guidelines

- All emails include: trip name, resort, dates, and a clear call-to-action button.
- All emails include an unsubscribe/opt-out link (CAN-SPAM compliance).
- The "Trip is starting soon" email (E-12) is sent 48 hours before `startDate` and includes: lodging address, check-in time, and a link to the trip page.
- Email open tracking is handled by Resend's analytics; the system stores `inviteEmailSentAt` and `reminderSentAt` for display in the organizer's invitation management page.

### 8.3 Notification Preferences

- Participants can set notification preferences on their profile:
  - Email me when trip details change: Yes / No
  - Email me for organizer announcements: Yes / No
  - Email me for expense updates: Yes / No (v2 feature)
- Organizers always receive withdrawal notifications regardless of preferences.

### 8.4 Email List Export

On the Invitations page, organizers can:
- Copy a formatted email list (e.g., `"Jane Doe" <jane@example.com>, ...`) for use in external email clients.
- Download CSV: name, email, interest status, guest count, rental needs.
- Filter the export by interest status (e.g., export only INTERESTED or only CONFIRMED).

---

## 9. Admin Features

### 9.1 Organizer Admin (Per-Trip)

All accessible from `/trips/[slug]/` sub-pages:

**Invitation Management (`/trips/[slug]/invitations`)**
- Table view of all sent invitations: email, name (if submitted), status, submitted date.
- Filter by status (PENDING / INTERESTED / NOT_INTERESTED / CONFIRMED / WAITLISTED).
- Bulk actions: select multiple → "Confirm Selected", "Send Reminder", "Mark as Not Going."
- Search by name or email.
- "Add Manual Response" — organizer can add someone directly without them filling out the form.

**Attendee Management (`/trips/[slug]/attendees`)**
- Confirmed participant list with skill level, rental needs, ski days, travel mode, school year, and sleeping preference.
- Room assignment field (freetext or drag-and-drop room builder — v2).
- Payment tracking: mark deposit paid, mark balance paid.
- Export as CSV.

**Trip Updates (`/trips/[slug]/updates`)**
- Create a new update (title + Markdown body).
- Toggle "Send as email to all confirmed participants."
- Pin important updates (show at top of the feed).
- Edit or delete updates.

**Danger Zone (within Trip Settings)**
- Transfer organizer ownership to another user.
- Cancel the trip (with confirmation modal and required reason).
- Delete the trip (only available while in DRAFT status).

### 9.2 Site Admin (`/admin`)

Reserved for accounts with `GlobalRole = ADMIN`:

- **Users table**: list all users, search by email, view their trips, manually activate accounts, soft-delete users.
- **Trips table**: list all trips across all organizers, filter by status, view any trip.
- **Email log**: see all transactional emails sent (template, recipient, sent date, delivery status via Resend webhook).
- **Invite token reset**: regenerate an invite token for a trip (invalidates old links).
- **System stats**: total trips, total users, trips by status, signups over time.

---

## 10. Nice-to-Have Features

These are out of scope for v1 but should be considered in the data model design to avoid costly refactors.

### 10.1 Interactive Availability Polling (v2)

Before selecting dates, the organizer can send a "when works for you?" poll (similar to Doodle) to a group. Responses feed into suggested trip dates.

### 10.2 Room Assignment Builder (v2)

Visual drag-and-drop interface for assigning participants to rooms/beds. Organizer defines lodging units (e.g., "Bedroom 1 - Queen," "Bunk Room - 4 beds"), then drags participant names into units.

### 10.3 Per-Person Deposit Override (v2)

Organizers can override the trip-level deposit amount on a per-person basis (e.g., to give a discount or charge a different rate for a special case). The `TripMember.depositAmount` field already exists for this purpose — v2 adds UI to expose it in the attendee management page. When set, the per-person value takes precedence over the trip-level `depositFloor` / `depositBed` amounts, and the confirmation form shown to that participant reflects the overridden value.

### 10.4 House Price Simulator (v2)

An interactive tool on the housing page that lets the organizer model different pricing scenarios without committing any changes. Inputs are sliders or numeric fields:
- House total price
- Number of bed spots
- Number of floor spots

As the organizer adjusts the inputs, the tool live-updates:
- Calculated price per bed spot
- Calculated price per floor spot
- Estimated cost per person in each category (after deposits)

The simulator does not write to any records — it is a planning scratchpad. A "Apply to selected house" button lets the organizer push the simulated values to `pricePerBedSpot` and `pricePerFloorSpot` on the selected house if they are satisfied with the result.

### 10.5 Integrated Payment / Venmo Request Links (v2)

- Generate a Venmo or PayPal.me request link pre-filled with the amount owed.
- Or integrate with Stripe to collect deposit payments directly in the app.
- `TripMember.depositPaid` and `TripMember.balancePaid` booleans already exist; adding `paymentIntentId` and `paymentStatus` supports Stripe integration later.

### 10.6 Post-Trip Survey (v2)

When a trip moves to COMPLETED, the system automatically sends a survey email (E-12 equivalent) to all confirmed participants with a unique, tokenized link that does not require login.

**Survey fields:**
- Overall trip rating (1–5 stars, required)
- Highlights (free text — what went well)
- What to do differently (free text)
- Would you return to this resort? (yes / no / maybe)
- Would you stay in this house again? (yes / no / maybe — only shown if a house was selected for the trip)
- Additional comments (free text)

**Organizer view:**
- Responses are visible only to organizers on a "Survey Results" tab of the past trip page.
- Results shown as: aggregate ratings (average star rating, % yes/no/maybe on return questions) and a scrollable list of free-text responses.
- Individual responses are attributed by name to the organizer but could optionally be anonymized (organizer setting).

The `SurveyResponse` data model (section 4.10) is already included in the schema to support this feature without a future migration.

### 10.7 Trip Comparison / Stats Page (v2)

A user's profile showing aggregate stats across all trips: total ski days, resorts visited, most frequent trip companions, total expenses.

### 10.8 Recurring Trip Templates (v2)

"Clone this trip" — duplicates a past trip's structure (resort, lodging, invite list) as a starting template for the next year's trip.

### 10.9 Public Trip Directory / Club Mode (v2)

A club admin manages multiple organizers and trips under one umbrella, with a public-facing directory of all club trips.

### 10.10 In-App Notifications (v2)

Real-time or polling-based notification bell in the nav bar for events like: new trip update posted, someone joins or withdraws, expense added.

### 10.11 Mobile App (v3)

Native iOS and Android apps using React Native, sharing business logic with the Next.js frontend via a shared TypeScript package.

### 10.12 Year-over-Year Trip Analytics (v3)

An organizer dashboard for recurring trips that compares key metrics across years. Trips can be grouped manually by the organizer or automatically matched by resort name.

Metrics displayed per year, side-by-side:
- Total headcount (bed vs. floor split)
- House price and price per bed/floor spot
- Average ski days per person
- Deposit collection rate (% of participants who paid before the deadline)
- Total trip expenses and average cost per person

Trends are surfaced visually (e.g., "Headcount: 18 → 24 → 31 over three years") using simple charts or a comparison table.

No new data models are required — all metrics are derived from existing `Trip`, `TripMember`, `PotentialHouse`, and `Expense` records. Accessible to organizers at `/trips/analytics`.

---

## 11. Edge Cases and Business Rules

### 11.1 Capacity and Waitlist

- `guestCount` on the interest form means the invitee is bringing that many people total (including themselves). When checking capacity, sum all `guestCount` values — not just the number of responses.
- Example: 10 responses all with `guestCount = 1` uses 10 capacity. One response with `guestCount = 4` uses 4 capacity.
- When confirming a group (guestCount > 1), each additional guest beyond the primary invitee needs to be tracked as a `TripMember`. The interest form should collect names of additional guests if possible, or default to "Guest of [Name]."
- If `capacityMin` is set and the invite deadline passes without meeting the minimum, the organizer is notified with the recommendation to cancel or extend the invite period.

### 11.2 Late Withdrawals

- A participant who withdraws after the `confirmDeadline` is still marked as WITHDRAWN.
- The system does not automatically process refunds (v1 has no payment gateway). The organizer is responsible for refund decisions.
- An organizer notes field on `TripMember` allows recording refund status manually.

### 11.3 Invitee Updates Their Response

- If an invitee changes from INTERESTED to NOT_INTERESTED after the deadline, the form shows a warning: "The deadline has passed. Contact the organizer to update your response."
- If the invitee changes from INTERESTED to NOT_INTERESTED but was already CONFIRMED, they must use the withdrawal flow (F-12) — not the interest form.

### 11.4 Duplicate Email Submissions

- If the same email submits the interest form twice without using the edit link, the new submission is merged into the existing `InterestResponse` (most recent data wins) rather than creating a duplicate record.
- The invitee is shown their current response with a note: "You've already submitted a response. Here's what we have on file."

### 11.5 Organizer Leaves the Trip

- If the sole organizer tries to remove themselves, the system blocks the action and prompts them to assign another participant as organizer first.
- If no other participants exist, the organizer must cancel the trip before leaving.

### 11.6 Expired Invite Links

- The `inviteToken` does not expire by default; it is valid for the life of the trip.
- An organizer can regenerate the invite token (via Trip Settings or Site Admin). Old links immediately stop working.
- If the trip is CONFIRMED, IN_PROGRESS, COMPLETED, or CANCELLED, accessing the invite link shows a message: "This invitation is no longer accepting responses." (Not a 404.)

### 11.7 Email Address Changes

- If a confirmed participant changes their email address, old edit-link tokens in previously sent emails continue to work (they look up `InterestResponse` by `editToken`, not by email).
- The new email address is used for all future notifications.

### 11.8 Trip Cancellation

- All confirmed `TripMember` records are frozen but retained for record-keeping.
- Cancellation email E-09 is sent to all INTERESTED and CONFIRMED respondents.
- The trip remains visible to organizers and past participants as a cancelled trip.
- Expenses remain accessible to support any settlement or reimbursement tracking.

### 11.9 Expense Edge Cases

- If a participant withdraws after expenses have been split, their `ExpenseSplit` records are not automatically re-calculated. The organizer must manually re-split or void and re-enter the expense.
- A warning is shown on the expense page: "X participants have withdrawn since some expenses were split. You may want to review and re-split those expenses."

### 11.10 Time Zone Handling

- All `DateTime` fields are stored in UTC.
- Trip `startDate` and `endDate` are stored as date-only values (no time component) to avoid time zone ambiguity.
- Deadlines (`inviteDeadline`, `confirmDeadline`) are stored as full UTC `DateTime`.
- The trip creation form shows deadline pickers in the organizer's local timezone and converts to UTC on save.
- Displayed times on the trip page show the resort's local time zone explicitly (e.g., "Check-in: 4:00 PM MT").

---

## 12. Non-Functional Requirements

### 12.1 Performance

- Trip detail page should load in under 2 seconds on a standard connection via server-side rendering.
- Interest form should be fully functional with JavaScript disabled (progressive enhancement via server actions).
- Invitation send operations (potentially 100+ emails) are handled asynchronously (queued, not blocking the HTTP request). Use Resend's batch send API or a background job queue (Inngest for serverless environments).

### 12.2 Security

- All API routes validate the authenticated user's role before performing mutations.
- Interest form submissions are rate-limited per IP (e.g., 10 submissions per hour) to prevent spam.
- `inviteToken` and `editToken` are cryptographically random (at least 32 bytes, URL-safe base64).
- Trip details (lodging address, attendee names) are never exposed on public/invite-view API endpoints.
- Input sanitization on all user-supplied text fields, especially Markdown fields rendered as HTML.
- CSRF protection on all state-mutating forms (handled by Next.js Server Actions by default).

### 12.3 Accessibility

- All interactive elements must be keyboard navigable.
- Sufficient color contrast (WCAG AA minimum) for status badges, buttons, and text.
- Screen reader support via semantic HTML and ARIA labels on custom components.
- Form errors are announced to screen readers on submission.

### 12.4 Scalability

- v1 architecture handles up to ~100 concurrent users and ~500 trips without modification.
- Prisma connection pooling via PgBouncer (provided by Neon/Supabase) handles serverless cold-start connection limits.
- Email sending via Resend handles up to 100 recipients per batch; for larger lists, paginate the batch send call.

### 12.5 Data Retention

- Trips and associated data are retained indefinitely (past trips are a core feature).
- Users can request account deletion, which soft-deletes their account and anonymizes name/email in records, but preserves expense and attendance records for data integrity of other participants.
- Hard-delete is available to site admins only.

### 12.6 Browser Support

- Last 2 major versions of Chrome, Firefox, Safari, and Edge.
- iOS Safari 16+ and Chrome for Android.

---

## Appendix A: URL Structure

```
Public invite:   /invite/[inviteToken]
With edit ref:   /invite/[inviteToken]?ref=[editToken]
Trip detail:     /trips/[slug]
Past trips:      /past-trips
```

## Appendix B: Prisma Schema Sketch (Key Models)

```prisma
model User {
  id        String     @id @default(cuid())
  email     String     @unique
  name      String
  phone     String?
  role      GlobalRole @default(USER)
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt

  organizedTrips    TripOrganizer[]
  memberships       TripMember[]
  interestResponses InterestResponse[]
  expenses          Expense[]
}

model Trip {
  id          String     @id @default(cuid())
  slug        String     @unique
  name        String
  status      TripStatus @default(DRAFT)
  visibility  Visibility @default(LINK_ONLY)
  resort      String
  startDate   DateTime
  endDate     DateTime
  inviteToken String     @unique @default(cuid())
  capacityMax Int?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  organizers        TripOrganizer[]
  members           TripMember[]
  interestResponses InterestResponse[]
  expenses          Expense[]
  updates           TripUpdate[]
}

model InterestResponse {
  id         String         @id @default(cuid())
  tripId     String
  userId     String?
  email      String
  name       String
  status     InterestStatus @default(PENDING)
  editToken  String         @unique @default(cuid())
  guestCount Int            @default(1)

  trip Trip  @relation(fields: [tripId], references: [id])
  user User? @relation(fields: [userId], references: [id])
}

enum TripStatus {
  DRAFT
  INVITING
  CONFIRMED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}
```
