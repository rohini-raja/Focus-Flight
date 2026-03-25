import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { SessionProvider } from "@/context/SessionContext";
import { Navbar } from "@/components/Navbar";

import Home from "@/pages/Home";
import BookFlight from "@/pages/BookFlight";
import ActiveFlight from "@/pages/ActiveFlight";
import Logbook from "@/pages/Logbook";
import TransitMode from "@/pages/TransitMode";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

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
          </WouterRouter>
          <Toaster />
        </SessionProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
