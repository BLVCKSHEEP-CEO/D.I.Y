import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AdminGate from './components/auth/admin-gate';
import Shell from './components/layout/shell';
import AssistantPage from './pages/assistant-page';
import AuthCallbackPage from './pages/auth-callback-page';
import NotFoundPage from './pages/not-found-page';
import SignInPage from './pages/sign-in-page';
import TopicDetailPage from './pages/topic-detail-page';

const HomePage = lazy(() => import('./pages/home-page'));
const KnowledgePage = lazy(() => import('./pages/knowledge-page'));
const AdminPage = lazy(() => import('./pages/admin-page'));
const AccountPage = lazy(() => import('./pages/account-page'));
const NewTopicPage = lazy(() => import('./pages/new-topic-page'));
const ProfilePage = lazy(() => import('./pages/profile-page'));
const PrivacyPage = lazy(() => import('./pages/privacy-page'));
const TermsPage = lazy(() => import('./pages/terms-page'));

function LazyPage({ children }) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <section className="diy-card p-4 sm:p-5">
            <p className="font-mono text-xs uppercase tracking-[0.16em]">Loading view...</p>
          </section>
        </main>
      }
    >
      {children}
    </Suspense>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<AssistantPage />} />
        <Route path="assistant" element={<AssistantPage />} />
        <Route path="account" element={<LazyPage><AccountPage /></LazyPage>} />
        <Route path="signin" element={<SignInPage />} />
        <Route path="community" element={<LazyPage><HomePage /></LazyPage>} />
        <Route path="new" element={<LazyPage><NewTopicPage /></LazyPage>} />
        <Route path="knowledge" element={<LazyPage><KnowledgePage /></LazyPage>} />
        <Route path="u/:handle" element={<LazyPage><ProfilePage /></LazyPage>} />
        <Route path="privacy" element={<LazyPage><PrivacyPage /></LazyPage>} />
        <Route path="terms" element={<LazyPage><TermsPage /></LazyPage>} />
        <Route
          path="admin"
          element={
            <AdminGate>
              <LazyPage><AdminPage /></LazyPage>
            </AdminGate>
          }
        />
        <Route path="topic/:slug" element={<TopicDetailPage />} />
        <Route path="home" element={<Navigate to="/community" replace />} />
      </Route>
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}







