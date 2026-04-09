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
    const timeout = setTimeout(() => controller.abort(), 180000);

    console.log("Sending request to:", process.env.ANYTHINGLLM_API_URL);

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
      console.error("ANYTHINGLLM ERROR:", response.status, errorText);

      let cleanMessage = `AI error ${response.status}.`;

      if (response.status === 524) {
        cleanMessage = "The AI took too long to respond. Try a shorter question.";
      } else if (response.status === 404) {
        cleanMessage = "Workspace or endpoint not found.";
      } else if (response.status === 401) {
        cleanMessage = "API key is invalid.";
      }

      return res.json({ reply: cleanMessage });
    }

    const data = await response.json();
    console.log("ANYTHINGLLM RESPONSE:", JSON.stringify(data, null, 2));

    const reply =
      data.textResponse ||
      data.text ||
      data.response ||
      data.message ||
      data.reply ||
      data?.data?.textResponse ||
      data?.data?.text ||
      data?.data?.response ||
      "No response from AI.";

    res.json({ reply });
  } catch (error) {
    console.error("FULL ERROR:", error);
    res.json({
      reply: `Connection issue: ${error.message}`,
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
