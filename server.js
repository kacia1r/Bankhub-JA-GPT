require("dotenv").config();
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/chat", async (req, res) => {
  const message = req.body.message?.trim();

  if (!message) {
    return res.status(400).json({ reply: "Please enter a message." });
  }

  try {
    console.log("User message:", message);
    console.log("API URL:", process.env.ANYTHINGLLM_API_URL);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 300000);

    const response = await fetch(process.env.ANYTHINGLLM_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.ANYTHINGLLM_API_KEY}`,
      },
      body: JSON.stringify({
        message,
        mode: "chat",
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const rawText = await response.text();
    console.log("AnythingLLM raw response:", rawText);

    if (!response.ok) {
      return res.status(response.status).json({
        reply: `AnythingLLM error: ${rawText || response.statusText}`,
      });
    }

    let data;
    try {
      data = JSON.parse(rawText);
    } catch (err) {
      console.error("JSON parse error:", err);
      return res.status(500).json({
        reply: "Invalid JSON returned from AnythingLLM.",
      });
    }

    const reply =
      data.textResponse ||
      data.response ||
      data.message ||
      data.reply ||
      data.text ||
      "No response from AI.";

    return res.json({ reply });
  } catch (error) {
    console.error("Chat error:", error);

    if (error.name === "AbortError") {
      return res.status(408).json({
        reply: "The AI took too long to respond. Try a shorter question.",
      });
    }

    return res.status(500).json({
      reply: "Error connecting to AI.",
    });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
