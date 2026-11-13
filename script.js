// Paste your Cloudflare Worker URL here after you deploy it
const WORKER_URL = "https://loreal-chatbot.julioleonkayser.workers.dev";

const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const chatWindow = document.getElementById("chatWindow");
const latestQuestion = document.getElementById("latestQuestion");

// The rules for the chatbot. It only talks beauty and L'Oréal.
const SYSTEM_PROMPT = `You are the L'Oréal Smart Routine & Product Advisor, a friendly beauty guide.

You help people with L'Oréal products and brands across makeup, skincare, haircare and fragrance, plus routines and recommendations.

Rules:
- Stay on beauty and L'Oréal. If someone asks about anything else, politely say you can only help with beauty and L'Oréal, then steer them back.
- Sound warm and human, like a good advisor in a store. Keep every answer to 2-4 short sentences.
- Plain text only. No markdown, bullet points or asterisks.
- If you need more info (skin type, hair type, budget), ask one quick question before recommending.
- Never invent product names, prices or claims. If you're not sure, say so.
- Remember what the user tells you in this chat, like their name or skin type, and use it.
- For skin conditions or allergies, suggest they check with a dermatologist.`;

// LevelUp: conversation history. Every message gets saved here
// and sent back each time, so the bot remembers the chat.
const history = [{ role: "system", content: SYSTEM_PROMPT }];

// Opening message (shown on screen only)
addBubble("assistant", "Hi, I'm your L'Oréal advisor. What are you looking for today?");

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  // Ignore sends while we're still waiting on an answer
  if (sendBtn.disabled) return;

  const text = userInput.value.trim();
  if (!text) return;

  // Show the question (LevelUp: latest question + user bubble)
  userInput.value = "";
  latestQuestion.textContent = `You asked: ${text}`;
  latestQuestion.hidden = false;
  addBubble("user", text);
  history.push({ role: "user", content: text });

  // Loading state
  const botBubble = addBubble("assistant", "Thinking…");
  botBubble.classList.add("thinking");
  sendBtn.disabled = true;

  try {
    // POST to the Worker, never straight to the AI
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history }),
    });

    if (!response.ok) throw new Error(`Worker error ${response.status}`);

    const data = await response.json();
    const reply = data.choices[0].message.content;

    botBubble.textContent = reply;
    botBubble.classList.remove("thinking");
    history.push({ role: "assistant", content: reply });
  } catch (error) {
    console.error(error);
    botBubble.textContent = "Sorry, something went wrong on my end. Try again in a moment.";
    botBubble.classList.remove("thinking");
    history.pop(); // drop the question that never got an answer
  } finally {
    sendBtn.disabled = false;
    userInput.focus();
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }
});

// Adds a chat bubble and scrolls to the bottom
function addBubble(role, text) {
  const bubble = document.createElement("div");
  bubble.className = `bubble ${role}`;
  bubble.textContent = text; // textContent keeps AI text safe
  chatWindow.appendChild(bubble);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return bubble;
}
