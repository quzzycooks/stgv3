import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bot, Send, Shield, UserCog } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { breakoutApi } from "@/api/breakout";
import { useIncidentSocket } from "@/hooks/useSocket";
import { useAuthStore } from "@/stores/authStore";
import { BreakoutRole, BREAKOUT_ROLE_LABEL } from "@/lib/enums";
import type { BreakoutMessage } from "@/api/types";
import { cn } from "@/lib/cn";

/**
 * The AI provider (Claude) returns markdown-ish prose — bold, bullet/numbered
 * steps, blank-line paragraphs. There's no markdown renderer here, so strip
 * the syntax and split into lines the UI can actually lay out, rather than
 * dumping the raw string (literal "**"/"-" and no line breaks) into a <div>.
 */
function formatAiAnswer(raw: string): { text: string; bullet: boolean }[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const bulletMatch = line.match(/^(?:[-*•]|\d+[.)])\s+(.*)$/);
      const text = (bulletMatch ? bulletMatch[1] : line).replace(/\*\*(.+?)\*\*/g, "$1");
      return { text, bullet: Boolean(bulletMatch) };
    });
}

export function BreakoutRoomPage() {
  const { incidentId } = useParams<{ incidentId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.userId);
  const [draft, setDraft] = useState("");
  const [activeTab, setActiveTab] = useState<"chat" | "ai">("chat");
  const [roleSheetOpen, setRoleSheetOpen] = useState(false);
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (incidentId) breakoutApi.join(incidentId).catch(() => {});
  }, [incidentId]);

  const { data: messages } = useQuery({
    queryKey: ["breakout", incidentId],
    queryFn: () => breakoutApi.messages(incidentId!),
    enabled: Boolean(incidentId),
  });

  useIncidentSocket(incidentId ?? null, (event, payload) => {
    if (event === "breakout:message") {
      queryClient.setQueryData<BreakoutMessage[]>(["breakout", incidentId], (prev) =>
        prev ? [...prev, payload as BreakoutMessage] : [payload as BreakoutMessage],
      );
    }
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = useMutation({
    mutationFn: (content: string) => breakoutApi.send(incidentId!, content),
    onSuccess: (message) => {
      queryClient.setQueryData<BreakoutMessage[]>(["breakout", incidentId], (prev) => (prev ? [...prev, message] : [message]));
      setDraft("");
    },
  });

  const acceptRole = useMutation({
    mutationFn: (role: (typeof BreakoutRole)[number]) => breakoutApi.acceptRole(incidentId!, role),
    onSuccess: () => setRoleSheetOpen(false),
  });

  const askAi = async () => {
    if (!aiQuestion.trim() || !incidentId) return;
    setAiLoading(true);
    setAiAnswer(null);
    try {
      const result = await breakoutApi.askAi(incidentId, aiQuestion);
      setAiAnswer(result.answer);
    } catch {
      setAiAnswer("The AI assistant isn't available right now.");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <AppShell showNav={false} showSos={false}>
      <div className="safe-top flex items-center justify-between px-5 pt-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} aria-label="Back" className="grid h-10 w-10 place-items-center rounded-full bg-card-elevated text-body">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="font-display text-base font-extrabold text-body">Breakout Room</h1>
            <p className="text-xs text-faint">Coordinating on-scene response</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setRoleSheetOpen(true)}
            aria-label="Take a coordination role"
            className="grid h-10 w-10 place-items-center rounded-full bg-tint-success text-success"
          >
            <UserCog size={17} />
          </button>
        </div>
      </div>

      <div className="flex gap-1.5 px-5 pt-3">
        <button
          onClick={() => setActiveTab("chat")}
          className={cn(
            "flex-1 rounded-2xl py-2.5 text-sm font-semibold transition-colors",
            activeTab === "chat" ? "bg-primary text-white" : "bg-card-elevated text-muted",
          )}
        >
          Chat
        </button>
        <button
          onClick={() => setActiveTab("ai")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-2.5 text-sm font-semibold transition-colors",
            activeTab === "ai" ? "bg-primary text-white" : "bg-card-elevated text-muted",
          )}
        >
          <Bot size={15} />
          AI Support
        </button>
      </div>

      {activeTab === "chat" ? (
        <>
          <div ref={scrollRef} className="flex flex-col gap-2.5 overflow-y-auto px-5 py-4" style={{ height: "calc(100dvh - 280px)" }}>
            {messages?.length === 0 && (
              <p className="mt-10 text-center text-sm text-faint">No messages yet. Coordinate calmly — this room is moderated.</p>
            )}
            {messages?.map((message) => {
              const mine = message.senderUserId === userId;
              return (
                <div key={message.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[78%] rounded-3xl px-4 py-2.5 text-sm",
                      mine ? "bg-primary text-white rounded-br-lg" : "bg-card-elevated border border-subtle text-body rounded-bl-lg",
                    )}
                  >
                    {message.senderRole && !mine && (
                      <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">
                        {BREAKOUT_ROLE_LABEL[message.senderRole]}
                      </p>
                    )}
                    <p>{message.content}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="safe-bottom flex items-center gap-2 border-t border-subtle bg-card px-4 py-3">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && draft.trim() && sendMessage.mutate(draft)}
              placeholder="Message the room…"
              className="h-12 flex-1 rounded-2xl border border-subtle bg-card-elevated px-4 text-[15px] text-body outline-none focus:border-accent"
            />
            <button
              onClick={() => draft.trim() && sendMessage.mutate(draft)}
              disabled={!draft.trim()}
              className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary text-white disabled:opacity-40"
            >
              <Send size={18} />
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-3 overflow-y-auto px-5 py-4" style={{ height: "calc(100dvh - 280px)" }}>
          <p className="rounded-2xl bg-tint-accent px-4 py-3 text-xs text-accent">
            Answers are safety-filtered — no dosage, diagnosis, or invasive-procedure guidance is ever given.
          </p>
          <textarea
            value={aiQuestion}
            onChange={(e) => setAiQuestion(e.target.value)}
            placeholder="e.g. How do I keep an unconscious person's airway open?"
            rows={3}
            className="rounded-2xl border border-subtle bg-card-elevated p-4 text-sm text-body outline-none focus:border-accent"
          />
          <Button fullWidth loading={aiLoading} onClick={askAi} icon={<Bot size={16} />}>
            Ask
          </Button>
          {aiAnswer && (
            <div className="flex flex-col gap-2 rounded-2xl border border-subtle bg-card-elevated p-4 text-sm text-body">
              {formatAiAnswer(aiAnswer).map((line, i) => (
                <p key={i} className={cn(line.bullet && "pl-4 -indent-4")}>
                  {line.bullet && "• "}
                  {line.text}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      <Sheet open={roleSheetOpen} onClose={() => setRoleSheetOpen(false)} title="Take a coordination role">
        <div className="flex flex-col gap-2">
          {BreakoutRole.map((role) => (
            <button
              key={role}
              onClick={() => acceptRole.mutate(role)}
              className="flex items-center gap-3 rounded-2xl border border-subtle bg-card-elevated px-4 py-3.5 text-left"
            >
              <div className="grid h-9 w-9 place-items-center rounded-full bg-tint-accent text-accent">
                <Shield size={15} />
              </div>
              <span className="font-semibold text-body text-sm">{BREAKOUT_ROLE_LABEL[role]}</span>
            </button>
          ))}
        </div>
      </Sheet>
    </AppShell>
  );
}
