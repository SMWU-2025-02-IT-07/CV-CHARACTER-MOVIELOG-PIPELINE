import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Screen0 from "@/app/components/Screen0";
import { Screen1 } from "@/app/components/Screen1";
import { Screen2 } from "@/app/components/Screen2";
import { Screen3 } from "@/app/components/Screen3";
import { Screen4 } from "@/app/components/Screen4";
import AppShell from "@/app/layout/AppShell";
import { useAppContext } from "@/context/AppContext";
import { HistoryDetailScreen } from "../components/HistoryDetailScreen";
import { HistoryScreen } from "../components/HistoryScreen";

function ShellRoute({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}

function RequireScenario({ children }: { children: ReactNode }) {
  const { scenarioId, scenes } = useAppContext();

  if (!scenarioId || scenes.length === 0) {
    return <Navigate to="/create" replace />;
  }

  return <>{children}</>;
}

function RequireResult({ children }: { children: ReactNode }) {
  const { finalVideoUrl, scenarioId, scenes } = useAppContext();

  if (finalVideoUrl) {
    return <>{children}</>;
  }

  if (scenarioId && scenes.length > 0) {
    return <Navigate to="/render" replace />;
  }

  return <Navigate to="/create" replace />;
}

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Screen0 />} />

      <Route
        path="/create"
        element={
          <ShellRoute>
            <Screen1 />
          </ShellRoute>
        }
      />

      <Route
        path="/scenario"
        element={
          <RequireScenario>
            <ShellRoute>
              <Screen2 />
            </ShellRoute>
          </RequireScenario>
        }
      />

      <Route
        path="/render"
        element={
          <RequireScenario>
            <ShellRoute>
              <Screen3 />
            </ShellRoute>
          </RequireScenario>
        }
      />

      <Route
        path="/result"
        element={
          <RequireResult>
            <ShellRoute>
              <Screen4 />
            </ShellRoute>
          </RequireResult>
        }
      />

      <Route
        path="/history"
        element={
          <ShellRoute>
            <HistoryScreen />
          </ShellRoute>
        }
      />

      <Route
        path="/history/:scenarioId"
        element={
          <ShellRoute>
            <HistoryDetailScreen />
          </ShellRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
