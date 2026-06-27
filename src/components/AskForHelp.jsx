import { useEffect, useRef, useState } from "react";
import { isAiHelpEnabled, requestHelp } from "../lib/ai";
import Icon from "./Icon";

const QUICK_PROMPTS = [
  "I don't know where to start.",
  "Explain the idea behind this.",
  "Why might my answer be wrong?",
];

export default function AskForHelp({ step, attempt, lessonId }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const threadRef = useRef(null);

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages, busy]);

  if (!isAiHelpEnabled()) return null;

  async function ask(question) {
    const text = question.trim();
    if (!text || busy) return;

    setError("");
    setInput("");
    const history = messages;
    setMessages((current) => [...current, { role: "user", text }]);
    setBusy(true);
    try {
      const reply = await requestHelp({
        step,
        attempt,
        history,
        question: text,
        lessonId,
      });
      setMessages((current) => [...current, { role: "model", text: reply }]);
    } catch (err) {
      setError(
        err?.message
          ? `Couldn't get help: ${err.message}`
          : "The AI helper isn't available right now — try the hints below.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        className="ask-help-trigger btn-icon-text"
        onClick={() => setOpen(true)}
      >
        <Icon name="sparkles" size={16} /> Confused? Ask for help
      </button>
    );
  }

  return (
    <section className="ask-help" aria-label="AI help">
      <div className="ask-help-head">
        <span className="ask-help-title">
          <Icon name="sparkles" size={16} /> Ask for help
        </span>
        <button
          type="button"
          className="ask-help-close"
          onClick={() => setOpen(false)}
          aria-label="Close help"
        >
          <Icon name="x" size={16} />
        </button>
      </div>

      <p className="ask-help-note">
        Tell me what's confusing — I'll explain and nudge you, but I won't give
        away the answer.
      </p>

      <div className="ask-help-thread" ref={threadRef}>
        {messages.map((message, index) => (
          <div key={index} className={`ask-help-msg ask-help-msg-${message.role}`}>
            {message.text}
          </div>
        ))}
        {busy && <div className="ask-help-msg ask-help-msg-model ask-help-typing">…</div>}
      </div>

      {messages.length === 0 && !busy && (
        <div className="ask-help-quick">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="ask-help-chip"
              onClick={() => ask(prompt)}
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {error && <p className="ask-help-error">{error}</p>}

      <form
        className="ask-help-form"
        onSubmit={(event) => {
          event.preventDefault();
          ask(input);
        }}
      >
        <input
          type="text"
          className="ask-help-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="What's confusing you?"
          aria-label="Ask the tutor a question"
          disabled={busy}
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={busy || !input.trim()}
        >
          Ask
        </button>
      </form>
    </section>
  );
}
