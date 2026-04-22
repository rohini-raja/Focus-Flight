import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { SessionProvider } from "@/context/SessionContext";
import { Navbar } from "@/components/Navbar";
import { Link, useLocation } from "wouter";
import { Plane, BookOpen, Settings as SettingsIcon, Train } from "lucide-react";
import { useSession } from "@/context/SessionContext";

import Home from "@/pages/Home";
import BookFlight from "@/pages/BookFlight";
import ActiveFlight from "@/pages/ActiveFlight";
import Logbook from "@/pages/Logbook";
import TransitMode from "@/pages/TransitMode";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();


const NAV_ITEMS = [
  { path: "/book",     label: "Book",     icon: Plane },
  { path: "/transit",  label: "Transit",  icon: Train },
  { path: "/logbook",  label: "Logbook",  icon: BookOpen },
  { path: "/settings", label: "Settings", icon: SettingsIcon },
];

function MobileNav() {
  const [location] = useLocation();
  const { activeSession } = useSession();
  if (location === "/flight" && activeSession) return null;
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 pb-safe"
      style={{ background: "rgba(10,14,26,0.92)", backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="flex justify-around items-center h-16 px-2">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
              location === item.path ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/book" component={BookFlight} />
      <Route path="/flight" component={ActiveFlight} />
      <Route path="/logbook" component={Logbook} />
      <Route path="/transit" component={TransitMode} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SessionProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Navbar />
            <Router />
            <MobileNav />
          </WouterRouter>
          <Toaster />
        </SessionProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
