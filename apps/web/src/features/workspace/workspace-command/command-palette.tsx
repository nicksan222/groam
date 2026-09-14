import { Button } from '@groam/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@groam/ui/components/dialog';
import { Input } from '@groam/ui/components/input';
import { Search } from 'lucide-react';
import { useCommandPalette } from '@/features/workspace/hooks/use-command-palette';
import { testIds } from '@/lib/test-ids';

export function CommandPalette() {
  const { go, onOpenChange, open, query, results, setQuery } = useCommandPalette();

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="gap-0 p-0 sm:max-w-lg" data-testid={testIds.commandPalette}>
        <DialogHeader className="sr-only">
          <DialogTitle>Jump to</DialogTitle>
          <DialogDescription>Search trips, ideas, issues, chats, and agents.</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="size-4 text-muted-foreground" />
          <Input
            autoFocus
            className="h-11 border-0 shadow-none focus-visible:ring-0"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Jump to a trip, idea, issue, chat, or agent"
            value={query}
          />
        </div>
        <div className="max-h-80 overflow-y-auto p-1">
          {results.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">Nothing matches.</p>
          ) : (
            results.map((result) => (
              <Button
                className="h-auto w-full justify-start gap-2 px-3 py-2"
                key={result.id}
                onClick={() => go(result)}
                variant="ghost"
              >
                <result.icon className="size-4 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-left">{result.label}</span>
                <span className="text-[11px] text-muted-foreground">{result.kind}</span>
              </Button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
