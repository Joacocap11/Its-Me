import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ErrorState, Spinner } from "./components/ui";
import { AttributeDetail } from "./pages/AttributeDetail";
import { LoginPage, SetupPage } from "./pages/AuthPages";
import { Dashboard } from "./pages/Dashboard";
import { NewAttribute } from "./pages/NewAttribute";
import { Sizes } from "./pages/Sizes";
import { AttributesProvider } from "./state/attributes";
import { useAuth } from "./state/auth";

export default function App() {
  const { status, error, retry } = useAuth();

  if (error) return <ErrorState message={error} onRetry={retry} />;
  if (!status) return <Spinner />;
  if (!status.configured) return <SetupPage />;
  if (!status.authenticated) return <LoginPage />;

  return (
    <AttributesProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="talles" element={<Sizes />} />
          <Route path="atributos/nuevo" element={<NewAttribute />} />
          <Route path="atributos/:id" element={<AttributeDetail />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </AttributesProvider>
  );
}
