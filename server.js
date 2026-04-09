require("dotenv").config();
const express = require("express");
const path = require("path");
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post("/api/chat", async (req, res) => {
  const { message } = req.body;

  if (!message || !message.trim()) {
    return res.json({ reply: "Please enter a message." });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    const response = await fetch(process.env.ANYTHINGLLM_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.ANYTHINGLLM_API_KEY}`,
      },
      body: JSON.stringify({
        message: message.trim(),
        mode: "chat",
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      return res.json({ reply: "AI error: " + errorText });
    }

    const data = await response.json();

    const reply =
      data.text ||
      data.response ||
      data.message ||
      "No response from AI.";

    res.json({ reply });
  } catch (error) {
    console.error("ERROR:", error.message);
    res.json({
      reply: "⚠️ Connection issue. Make sure AnythingLLM is running.",
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
