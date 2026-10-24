/** Desktop landing canvas before selecting a conversation. */
export function ChatEmptyPane() {
  return (
    <div className="flex h-full min-h-0 flex-1 items-center justify-center px-8 py-12">
      <p className="max-w-xs text-center text-sm text-muted-foreground text-pretty">
        Pick a chat or start one.
      </p>
    </div>
  );
}
