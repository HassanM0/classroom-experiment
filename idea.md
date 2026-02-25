**Build me a real-time multiplayer web platform for a classroom experiment on strategic communication and opinion dynamics.**

**The core idea:**
There is a hidden (discrete) true state of the world, a number drawn from a known range (e.g. 1–100). Players are split into two secret roles: **Advocates** and **Truth-seekers**. Advocates know the true state and have a hidden bias — they want to push the collective opinion of the room away from the truth in a particular direction. Truth-seekers have no private information and must estimate the true state solely based on messages they receive from others. Nobody knows who belongs to which role, except their own group.

The game runs in **rounds** (around 4–6). Each round, every player sends a numeric message to their assigned neighbors (the network structure is set by the game host, 3 choices: complete graph, circle/line, or random graph). Truth-seekers update their current opinion based on received messages — you can implement a simple weighted averaging rule where their new opinion is a blend of their current opinion and the average of incoming messages, with a stubbornness parameter the host can configure. After all rounds, everyone submits a final guess of the true state. Advocates are scored on how far they shifted the room's average belief toward their target. Truth-seekers are scored on how close their final guess is to the true state.

**The host needs a control panel to:**
 - Set the true state, the bias direction and magnitude, the number of rounds, the stubbornness parameter, and the round timer
 - Assign players to roles (or do it randomly) and configure the network (who can message whom)
 - Start and stop rounds, and reveal the true state and roles at the end
 - See a live visualization of how the average opinion of the room is evolving across rounds — an opinion trajectory chart that updates in real time

**Players join via a room code on any device (phone or laptop), no login required.** The interface should be clean and minimal — each round they see their current opinion, the messages they received last round, and a field to type and send their message for this round. They should also see a simple live chart of their own opinion trajectory over rounds.

 **At the end**, there should be a results screen showing the true state, each player's final guess, who the advocates were, and the full opinion trajectory of the room — this is used for the debrief.











