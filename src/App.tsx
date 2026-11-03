import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { LoginPage } from "@/pages/LoginPage";
import { SitesPage } from "@/pages/SitesPage";
import { SiteDetailPage } from "@/pages/SiteDetailPage";
import { TaskDetailPage } from "@/pages/TaskDetailPage";
import { MyTasksPage } from "@/pages/MyTasksPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route index element={<SitesPage />} />
            <Route path="sites/:siteId" element={<SiteDetailPage />} />
            <Route path="tasks/:taskId" element={<TaskDetailPage />} />
            <Route path="my-tasks" element={<MyTasksPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster richColors position="bottom-right" />
    </BrowserRouter>
  );
}
