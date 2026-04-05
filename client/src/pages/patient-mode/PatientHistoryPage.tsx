import { useState } from "react";
import { History, Clock, User2, ChevronDown, ChevronUp, Brain, Loader2, AlertCircle, MessageSquare } from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import { selectPatientSession } from "@/store/selectors";
import { useGetConversationsQuery } from "@/services";
import type { ConversationRecord } from "@/types";
import { cn } from "@/lib/utils";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function duration(started: string, ended: string | null) {
  if (!ended) return "Ongoing";
  const ms = new Date(ended).getTime() - new Date(started).getTime();
  const m  = Math.floor(ms / 60000);
  if (m < 1) return "< 1 min";
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

const RELATION_COLORS: Record<string, string> = {
  son:      "bg-blue-500/15 text-blue-700",
  daughter: "bg-pink-500/15 text-pink-700",
  wife:     "bg-rose-500/15 text-rose-700",
  husband:  "bg-orange-500/15 text-orange-700",
  doctor:   "bg-emerald-500/15 text-emerald-700",
  nurse:    "bg-teal-500/15 text-teal-700",
  friend:   "bg-violet-500/15 text-violet-700",
};
const relColor = (rel: string | null) =>
  RELATION_COLORS[(rel ?? "").toLowerCase()] ?? "bg-muted text-muted-foreground";

// ─── Single conversation card ─────────────────────────────────────────────────
function ConvCard({ conv }: { conv: ConversationRecord }) {
  const [open, setOpen] = useState(false);
  const person = conv.person;

  return (
    <div className={cn(
      "rounded-2xl border bg-card overflow-hidden transition-all",
      open ? "border-foreground/20 shadow-sm" : "border-border hover:border-foreground/10",
    )}>
      {/* Header row */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left"
      >
        {/* Person avatar */}
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted">
          {person?.name ? (
            <span className="text-sm font-bold text-foreground">
              {person.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
            </span>
          ) : (
            <User2 className="size-5 text-muted-foreground" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground">
              {person?.name ?? "Unknown person"}
            </p>
            {person?.relation && (
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize", relColor(person.relation))}>
                {person.relation}
              </span>
            )}
            {!conv.ended_at && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {formatDate(conv.started_at)}
            </span>
            <span>·</span>
            <span>{duration(conv.started_at, conv.ended_at)}</span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <MessageSquare className="size-3" />
              {conv.transcripts.length} lines
            </span>
          </div>
        </div>

        <div className="shrink-0 text-muted-foreground">
          {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </div>
      </button>

      {/* Expanded content */}
      {open && (
        <div className="border-t border-border px-5 pb-5 pt-4 space-y-4">
          {conv.summary && (
            <div className="rounded-xl bg-foreground/5 border border-border p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <Brain className="size-3" /> AI Summary
              </p>
              <div className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                {conv.summary}
              </div>
            </div>
          )}

          {conv.transcripts.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Transcript
              </p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {conv.transcripts.map((t, i) => (
                  <div key={t.id} className="flex gap-2.5 text-sm">
                    <span className="shrink-0 text-[10px] text-muted-foreground/60 mt-0.5 tabular-nums w-6 text-right">
                      {i + 1}
                    </span>
                    <p className="text-foreground leading-relaxed">{t.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!conv.summary && conv.transcripts.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No transcript recorded for this conversation.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── History page ─────────────────────────────────────────────────────────────
export default function PatientHistoryPage() {
  const session = useAppSelector(selectPatientSession);
  const { data, isLoading, isError } = useGetConversationsQuery(
    session?.patientId ?? 0,
    { skip: !session },
  );

  const conversations = data?.data ?? [];

  // Group by date
  const grouped = conversations.reduce<Record<string, ConversationRecord[]>>((acc, c) => {
    const key = new Date(c.started_at).toLocaleDateString("en-IN", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {});

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-5 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-muted">
            <History className="size-5 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Conversation history</h1>
            <p className="text-sm text-muted-foreground">
              {conversations.length === 0 ? "No conversations yet" : `${conversations.length} conversations`}
            </p>
          </div>
        </div>

        {/* States */}
        {isLoading && (
          <div className="flex justify-center py-20">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {isError && (
          <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            Failed to load conversation history.
          </div>
        )}

        {!isLoading && !isError && conversations.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
              <MessageSquare className="size-7 text-muted-foreground/50" />
            </div>
            <div>
              <p className="font-semibold text-foreground">No conversations yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Conversations are saved automatically when you use the live transcription feature.
              </p>
            </div>
          </div>
        )}

        {/* Grouped conversation list */}
        {Object.entries(grouped).map(([date, convs]) => (
          <div key={date} className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs font-semibold text-muted-foreground shrink-0">{date}</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            {convs.map((c) => <ConvCard key={c.id} conv={c} />)}
          </div>
        ))}
      </div>
    </div>
  );
}
