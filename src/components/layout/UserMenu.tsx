"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createBrowserClient } from "@/lib/supabase/client";
import { ChevronDown, LogOut, Settings } from "lucide-react";
import { useRouter } from "next/navigation";

type UserMenuProps = {
  userFullName: string | null;
  userAvatarUrl: string | null;
  userEmail: string;
};

export function UserMenu({
  userFullName,
  userAvatarUrl,
  userEmail,
}: UserMenuProps) {
  const router = useRouter();

  const initials = userFullName
    ? userFullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : userEmail[0].toUpperCase();

  const displayName = userFullName || userEmail.split("@")[0];

  const handleSignOut = async () => {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="h-auto max-w-[200px] gap-2 rounded-lg px-2 py-1.5 font-normal hover:bg-[var(--app-header-hover)]"
          >
            <Avatar className="size-8 border border-border/60">
              {userAvatarUrl && (
                <AvatarImage src={userAvatarUrl} alt={displayName} />
              )}
              <AvatarFallback className="bg-primary text-[11px] font-semibold text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="hidden min-w-0 truncate text-left text-sm font-medium text-foreground sm:inline">
              {displayName}
            </span>
            <ChevronDown
              className="hidden size-4 shrink-0 text-muted-foreground sm:inline"
              aria-hidden
            />
          </Button>
        }
      />
      <DropdownMenuContent
        align="end"
        alignOffset={-4}
        sideOffset={8}
        className="w-64"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-0.5 py-0.5">
              <span className="truncate text-sm font-medium text-foreground">
                {displayName}
              </span>
              <span className="truncate text-xs font-normal text-muted-foreground">
                {userEmail}
              </span>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/settings/members")}>
          <Settings className="size-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
          <LogOut className="size-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
