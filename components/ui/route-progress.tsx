"use client";

import { Loader2 } from "lucide-react";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type RouteProgressContextValue = {
  startNavigation: (href?: string) => void;
};

const RouteProgressContext = createContext<RouteProgressContextValue | null>(null);

function shouldTrackLink(anchor: HTMLAnchorElement) {
  const href = anchor.getAttribute("href");

  if (
    !href ||
    href.startsWith("#") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:") ||
    anchor.target === "_blank" ||
    anchor.hasAttribute("download")
  ) {
    return false;
  }

  const nextUrl = new URL(anchor.href, window.location.href);
  const currentUrl = new URL(window.location.href);

  if (nextUrl.origin !== currentUrl.origin) {
    return false;
  }

  return `${nextUrl.pathname}${nextUrl.search}` !== `${currentUrl.pathname}${currentUrl.search}`;
}

export function RouteProgressProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopNavigation = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setIsNavigating(false);
  }, []);

  const startNavigation = useCallback((href?: string) => {
    if (href) {
      const nextUrl = new URL(href, window.location.href);
      const currentUrl = new URL(window.location.href);
      if (`${nextUrl.pathname}${nextUrl.search}` === `${currentUrl.pathname}${currentUrl.search}`) {
        return;
      }
    }

    setIsNavigating(true);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setIsNavigating(false);
      timeoutRef.current = null;
    }, 8000);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(stopNavigation, 0);
    return () => clearTimeout(timeout);
  }, [pathname, stopNavigation]);

  useEffect(() => () => stopNavigation(), [stopNavigation]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const anchor = (event.target as HTMLElement | null)?.closest("a");
      if (anchor && shouldTrackLink(anchor)) {
        startNavigation(anchor.href);
      }
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [startNavigation]);

  const contextValue = useMemo(() => ({ startNavigation }), [startNavigation]);

  return (
    <RouteProgressContext value={contextValue}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-[80] h-1.5 overflow-hidden bg-primary/15 transition-opacity duration-150 data-[visible=false]:opacity-0"
        data-visible={isNavigating ? "true" : "false"}
        aria-hidden={!isNavigating}
      >
        <div className="route-progress-bar h-full w-1/2 rounded-full bg-primary shadow-[0_0_16px_var(--primary)]" />
      </div>
      {isNavigating ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed right-4 top-4 z-[81] flex items-center gap-3 rounded-lg border bg-popover px-4 py-3 text-popover-foreground shadow-xl ring-1 ring-foreground/10 sm:right-6 sm:top-6"
        >
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Loader2 aria-hidden className="size-5 animate-spin" />
          </div>
          <div>
            <div className="text-sm font-medium">Loading page</div>
            <div className="text-xs text-muted-foreground">Fetching the latest data...</div>
          </div>
        </div>
      ) : null}
    </RouteProgressContext>
  );
}

export function useRouteProgress() {
  const context = useContext(RouteProgressContext);

  if (!context) {
    return {
      startNavigation: () => undefined,
    };
  }

  return context;
}
