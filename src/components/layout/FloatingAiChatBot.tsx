"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, X, Send, Sparkles, HelpCircle, ArrowRight } from "lucide-react";

interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
  time: string;
}

const QUICK_CHIPS = [
  "How do I connect Google Sheets?",
  "What is a webhook?",
  "Why is my test failing?",
  "How do I add a step?",
];

const KNOWLEDGE_RESPONSES: Record<string, string> = {
  "How do I connect Google Sheets?":
    "To connect Google Sheets, navigate to your workflow's detail page and click 'Connect Google Sheets'. You will be securely redirected to Google OAuth to authorize spreadsheet read/write access. Afterward, select your spreadsheet and target worksheet tab. Credentials are encrypted via AES-256-GCM.",
  "What is a webhook?":
    "A webhook is an automated HTTP intake endpoint that allows external services (like your website contact form, WordPress, or Typeform) to send event payloads directly to Digilo in real-time. Once incoming data arrives, your workflow triggers immediately.",
  "Why is my test failing?":
    "Common causes for test failures include: 1) Missing or expired OAuth connection for Google Sheets or Slack, 2) Unselected target spreadsheet tab or Slack channel, or 3) Rate limiting. Check that all required integrations display a green 'CONNECTED' badge before running a test.",
  "How do I add a step?":
    "On the /automation builder page, click 'EDIT STEPS' below the generated workflow. You can click '+ Add Step', adjust the step's parameters, drag to reorder steps, or delete unnecessary steps before clicking 'Save Changes'.",
};

export default function FloatingAiChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "initial",
      sender: "assistant",
      text: "Hi! I'm your DIGILO AI Assistant. How can I help you automate your business workflows today?",
      time: "Just now",
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isTyping]);

  const handleSendMessage = (textToSend?: string) => {
    const messageText = (textToSend || input).trim();
    if (!messageText) return;

    const userMsg: Message = {
      id: "usr_" + Date.now(),
      sender: "user",
      text: messageText,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput("");
    setIsTyping(true);

    // Simulate AI response resolution
    setTimeout(() => {
      let replyText =
        KNOWLEDGE_RESPONSES[messageText] ||
        `Thanks for asking about "${messageText}". In DIGILO, you can describe any business workflow in plain language, connect your Google Workspace or Slack accounts with one click, run automated dry-run tests, and activate to production. Is there a specific integration or workflow step you'd like guidance on?`;

      const aiMsg: Message = {
        id: "ai_" + Date.now(),
        sender: "assistant",
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 700);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Trigger Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Open DIGILO AI Assistant"
        className="relative flex items-center justify-center w-14 h-14 rounded-full bg-[#C8FF00] text-black shadow-lg shadow-[#C8FF00]/20 hover:shadow-[#C8FF00]/40 transition-shadow focus:outline-none"
      >
        <span className="absolute -inset-1 rounded-full bg-[#C8FF00]/30 animate-ping opacity-75 pointer-events-none" />
        {isOpen ? <X className="w-6 h-6" /> : <Bot className="w-7 h-7" />}
      </motion.button>

      {/* Expanded Chat Drawer / Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-4 bottom-24 md:inset-auto md:right-6 md:bottom-24 w-auto md:w-[380px] h-[500px] max-h-[80vh] flex flex-col bg-[#111111] border border-[#222222] rounded-lg shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#1A1A1A] border-b border-[#222222]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#C8FF00] flex items-center justify-center text-black font-bold">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white tracking-tight">DIGILO AI Assistant</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#A0A0A0]">Online</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-[#A0A0A0] hover:text-white transition-colors p-1"
                aria-label="Close Assistant"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Questions Chips */}
            <div className="px-3 py-2 bg-[#0A0A0A]/60 border-b border-[#222222] overflow-x-auto flex gap-1.5 scrollbar-none">
              {QUICK_CHIPS.map((chip) => (
                <button
                  key={chip}
                  onClick={() => handleSendMessage(chip)}
                  className="whitespace-nowrap px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider rounded bg-[#1A1A1A] text-[#A0A0A0] hover:text-[#C8FF00] hover:border-[#C8FF00]/40 border border-[#222222] transition-all"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Message Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#0A0A0A]">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-3.5 py-2.5 text-xs leading-relaxed ${
                      msg.sender === "user"
                        ? "bg-[#C8FF00] text-black font-medium"
                        : "bg-[#1A1A1A] text-white border border-[#222222]"
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[10px] font-mono text-[#555555] mt-1 px-1">{msg.time}</span>
                </div>
              ))}

              {isTyping && (
                <div className="flex items-center gap-1.5 p-3 rounded-lg bg-[#1A1A1A] border border-[#222222] w-fit">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C8FF00] animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C8FF00] animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C8FF00] animate-bounce [animation-delay:0.4s]" />
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-3 bg-[#111111] border-t border-[#222222] flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about workflows, integrations..."
                className="flex-1 bg-[#1A1A1A] border border-[#222222] focus:border-[#C8FF00] rounded px-3 py-2 text-xs text-white placeholder-[#555555] outline-none font-sans transition-colors"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="px-3 py-2 bg-[#C8FF00] hover:bg-[#b2e600] disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold rounded transition-colors flex items-center justify-center"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

