import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Sparkles, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AmbientGlow from "@/components/AmbientGlow";

interface Message {
  sender: "user" | "ai";
  text: string;
}

function generatePrediction() {
  const steps = 7500 + Math.floor(Math.random() * 4000);
  const calories = 1200 + Math.floor(Math.random() * 700);
  const stress = 5 + Math.floor(Math.random() * 5);
  const consistency = 70 + Math.floor(Math.random() * 25);

  return (
    `🔥 Next Month Projection 🔥\n\n` +
    `If you continue at your current pace:\n\n` +
    `• You will walk ${steps * 30} total steps next month.\n` +
    `• You are expected to burn ${calories * 30} calories.\n` +
    `• Stress levels may improve by ${stress}%.\n` +
    `• Expected consistency score: ${consistency}%.\n\n` +
    `✨ You're on track to build amazing habits. Keep going!`
  );
}

function getReply(text: string) {
  if (/predict|progress|month/i.test(text)) {
    return generatePrediction();
  }
  return "I understand! Staying consistent will help you progress. Want me to predict your next month?";
}

const AIChatPage = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    { sender: "ai", text: generatePrediction() },
  ]);
  const [input, setInput] = useState("");
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    const userMsg: Message = { sender: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setTimeout(() => {
      setMessages((prev) => [...prev, { sender: "ai", text: getReply(text) }]);
    }, 400);
  };

  return (
    <div className="h-screen bg-background relative overflow-hidden flex flex-col">
      <AmbientGlow />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-14 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="glass w-10 h-10 rounded-full flex items-center justify-center hover:glow-primary transition-all duration-300"
        >
          <ArrowLeft className="w-5 h-5 text-primary" />
        </button>
        <h1 className="font-heading text-lg font-bold text-glow">AI Predictions</h1>
        <div className="w-10 h-10 rounded-full futuristic-gradient flex items-center justify-center glow-primary">
          <Sparkles className="w-5 h-5 text-foreground" />
        </div>
      </div>

      {/* Chat area */}
      <div ref={chatRef} className="relative z-10 flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 font-body text-sm whitespace-pre-line ${
                msg.sender === "user"
                  ? "glass-strong text-foreground"
                  : "glass text-muted-foreground"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      {/* Input bar */}
      <div className="relative z-10 px-6 pb-8 pt-2">
        <div className="glass-strong rounded-full flex items-center px-4 py-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Ask something..."
            className="flex-1 bg-transparent border-none outline-none font-body text-sm text-foreground placeholder:text-muted-foreground"
          />
          <button
            onClick={send}
            className="ml-2 w-10 h-10 rounded-full futuristic-gradient flex items-center justify-center glow-primary hover:scale-105 transition-transform"
          >
            <Send className="w-4 h-4 text-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIChatPage;
