## Project: Strategic Communication & Opinion Dynamics — Classroom Experiment web-app/platform

### Overview

Build a simple real-time multiplayer web platform for running a classroom game theory experiment. The experiment studies how biased strategic communication 
(cheap talk) shapes opinion dynamics in a network. The platform needs a host 
dashboard and a student-facing game interface.

---

## The Game Logic (Read This Carefully)

### Roles

There are two types of players, assigned secretly by the host:

1. **Truth-Seekers** (~70% of students)
   - Start with a prior belief of 50 (on a scale of 1–100)
   - Have NO private information about the true state θ
   - Each round, they receive messages from their network neighbors
   - They update their opinion using a weighted average rule:
     new_opinion = (1 - α) * current_opinion + α * average(received_messages)
   - α is a parameter set by the host (e.g. 0.4)
   - They are scored at the end based on how close their final opinion is to θ
   - Score = 100 - (final_opinion - θ)²  (capped at 0)

2. **Advocates** (~30% of students)
   - Know the true state θ exactly
   - Have a bias b (set by host, e.g. b = 8), meaning they want truth-seekers 
     to end up believing θ + b
   - Each round, they can send ANY number (1–100) as their message — pure cheap talk
   - They are scored based on how close the AVERAGE truth-seeker final opinion 
     is to θ + b
   - Score = 100 - (avg_truthseeker_opinion - (θ + b))²  (capped at 0)
   - Advocates can see each other's messages (they know who the other advocates are)
   - Truth-seekers do NOT know who the advocates are

### Network Structure

- Each student has a fixed set of neighbors (assigned by host before the game)
- Students only receive messages from their neighbors each round
- The host can choose between:
  - **Sparse/clustered**: students in groups of 4-5, with one bridge node between groups
  - **Integrated**: advocates scattered uniformly, no obvious clusters

### Round Structure

The game runs for T rounds (host sets T, e.g. T = 6). Each round:

1. All players simultaneously write and submit a message (a number 1–100)
2. Once all players have submitted, messages are delivered to neighbors
3. Truth-seekers see the messages from their neighbors and their opinion auto-updates
4. Advocates see messages from their neighbors AND see current avg truth-seeker opinion
5. A short timer (e.g. 60 seconds) counts down before the next round opens
6. After round T, final opinions are locked and scores are computed

### End of Game

- Reveal θ to everyone
- Show each player their score
- host dashboard shows: full opinion trajectory of every player, who the advocates 
  were, network graph with message history

---

## host Dashboard (Admin Panel)

The host has a separate login/view with full control:

**Setup Phase (before game starts):**
- Input: true state θ (or randomize it)
- Input: bias b
- Input: α (updating weight)
- Input: number of rounds T
- Input: round timer duration (seconds)
- Input: network type (line graph, circle graph, random graph, fully connected graph)
- Generate a game room with a join code (e.g. "ECON42")
- See a list of students who have joined
- Assign roles (Truth-Seeker / Advocate) manually or randomly with ratio control
- Start the game when ready

**Live Game View (during game):**
- Real-time network graph showing all students as nodes, with edges = neighbor connections
- Live opinion distribution histogram updating each round
- Table showing each student, their current opinion, and their last sent message
- Ability to pause the game between rounds

**Post-Game Analytics:**
- Line chart: opinion trajectory over rounds for each player
- Show θ and θ+b as horizontal reference lines
- Bar chart: final opinion distribution vs θ
- Export data as CSV (student_id, role, round, message_sent, opinion_after_update)

---

## Student Interface

Students join via a room code on their phone or laptop.

**Lobby screen:**
- Enter name + room code
- Waiting room showing how many players have joined
- Role is revealed privately once host starts: "You are a Truth-Seeker" or 
  "You are an Advocate. The true state is θ = [X]. Your target is [X+b]."
- Show their neighbor list (by name/ID, not role)

**Game screen (each round):**
- Prominent round counter: "Round 3 of 6"
- Countdown timer
- Their current opinion displayed as a large number and as a position on a 1–100 slider
  (truth-seekers only — advocates see θ instead)
- Message inbox: messages received from neighbors last round 
  (just the numbers, no names attached — anonymous)
- For truth-seekers: show the auto-calculated new opinion before confirming 
  ("Based on messages received, your opinion will update to: 58. Confirm?")
- Message compose box: type a number 1–100 and hit Send
- For advocates: small panel showing current average truth-seeker opinion 
  (their strategic intel) + messages from fellow advocates

**End screen:**
- "The true state was θ = [X]"
- "Your final opinion: [Y]"
- "Your score: [Z]"
- Leaderboard (optional, host can toggle)

---
- **No login/auth needed**: join by name + room code only

---


 The platform should feel lightweight and work reliably with 15–30 simultaneous players in a classroom setting. Think about what stack makes real-time multiplayer simple and robust. You have full freedom on architecture, design, and implementation — prioritize something that actually works smoothly in a live classroom with minimal setup friction for the host.

Players should be able to join via a shareable URL that encodes the room code, like yourdomain.com/join/ABC123. When the host creates a session, generate this link automatically and display it with a QR code they can project on screen. Players open the link on any device, enter a name, and are placed directly into the session. Deploy the app so it is publicly accessible on the internet — use whatever hosting and real-time infrastructure makes this simplest.
