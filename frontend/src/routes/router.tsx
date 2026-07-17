import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { SplashPage } from "@/features/auth/SplashPage";
import { Placeholder } from "./Placeholder";
import { ProtectedRoute, PublicOnlyRoute, RegistrationRoute } from "./ProtectedRoute";

const OnboardingPage = lazy(() => import("@/features/onboarding/OnboardingPage").then((m) => ({ default: m.OnboardingPage })));
const LoginPage = lazy(() => import("@/features/auth/LoginPage").then((m) => ({ default: m.LoginPage })));
const OtpVerifyPage = lazy(() => import("@/features/auth/OtpVerifyPage").then((m) => ({ default: m.OtpVerifyPage })));
const UnlockPage = lazy(() => import("@/features/auth/UnlockPage").then((m) => ({ default: m.UnlockPage })));

const IdentityStepPage = lazy(() => import("@/features/registration/IdentityStepPage").then((m) => ({ default: m.IdentityStepPage })));
const ContactsStepPage = lazy(() => import("@/features/registration/ContactsStepPage").then((m) => ({ default: m.ContactsStepPage })));
const MedicalStepPage = lazy(() => import("@/features/registration/MedicalStepPage").then((m) => ({ default: m.MedicalStepPage })));
const ConsentsStepPage = lazy(() => import("@/features/registration/ConsentsStepPage").then((m) => ({ default: m.ConsentsStepPage })));
const ReviewStepPage = lazy(() => import("@/features/registration/ReviewStepPage").then((m) => ({ default: m.ReviewStepPage })));

const HomePage = lazy(() => import("@/features/home/HomePage").then((m) => ({ default: m.HomePage })));
const SosPage = lazy(() => import("@/features/sos/SosPage").then((m) => ({ default: m.SosPage })));
const WelfarePage = lazy(() => import("@/features/welfare/WelfarePage").then((m) => ({ default: m.WelfarePage })));
const DetectionDemoPage = lazy(() => import("@/features/detection/DetectionDemoPage").then((m) => ({ default: m.DetectionDemoPage })));
const SituationRoomPage = lazy(() =>
  import("@/features/situation-room/SituationRoomPage").then((m) => ({ default: m.SituationRoomPage })),
);
const BreakoutRoomPage = lazy(() => import("@/features/breakout/BreakoutRoomPage").then((m) => ({ default: m.BreakoutRoomPage })));
const IncidentSummaryPage = lazy(() =>
  import("@/features/incident-dna/IncidentSummaryPage").then((m) => ({ default: m.IncidentSummaryPage })),
);

const ContactsPage = lazy(() => import("@/features/contacts/ContactsPage").then((m) => ({ default: m.ContactsPage })));
const MedicalProfilePage = lazy(() => import("@/features/medical/MedicalProfilePage").then((m) => ({ default: m.MedicalProfilePage })));

const DrillsHubPage = lazy(() => import("@/features/drills/DrillsHubPage").then((m) => ({ default: m.DrillsHubPage })));
const DrillSessionPage = lazy(() => import("@/features/drills/DrillSessionPage").then((m) => ({ default: m.DrillSessionPage })));
const SkillVerificationPage = lazy(() =>
  import("@/features/drills/SkillVerificationPage").then((m) => ({ default: m.SkillVerificationPage })),
);

const KnowledgeLibraryPage = lazy(() =>
  import("@/features/knowledge/KnowledgeLibraryPage").then((m) => ({ default: m.KnowledgeLibraryPage })),
);
const ArticleDetailPage = lazy(() => import("@/features/knowledge/ArticleDetailPage").then((m) => ({ default: m.ArticleDetailPage })));

const ProfilePage = lazy(() => import("@/features/profile/ProfilePage").then((m) => ({ default: m.ProfilePage })));
const NotificationsPage = lazy(() => import("@/features/notifications/NotificationsPage").then((m) => ({ default: m.NotificationsPage })));
const SettingsPage = lazy(() => import("@/features/settings/SettingsPage").then((m) => ({ default: m.SettingsPage })));

function RouteFallback() {
  return (
    <div className="app-shell flex min-h-dvh items-center justify-center bg-canvas">
      <div className="h-9 w-9 animate-spin rounded-full border-4 border-[var(--border-subtle)] border-t-primary" />
    </div>
  );
}

export function AppRouter() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<SplashPage />} />

        <Route element={<PublicOnlyRoute />}>
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/login/otp" element={<OtpVerifyPage />} />
        </Route>

        <Route path="/unlock" element={<UnlockPage />} />

        <Route element={<RegistrationRoute />}>
          <Route path="/register/identity" element={<IdentityStepPage />} />
          <Route path="/register/contacts" element={<ContactsStepPage />} />
          <Route path="/register/medical" element={<MedicalStepPage />} />
          <Route path="/register/consents" element={<ConsentsStepPage />} />
          <Route path="/register/review" element={<ReviewStepPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/home" element={<HomePage />} />
          <Route path="/sos" element={<SosPage />} />
          <Route path="/welfare/:sessionId" element={<WelfarePage />} />
          <Route path="/detection-demo" element={<DetectionDemoPage />} />
          <Route path="/incidents/:incidentId" element={<SituationRoomPage />} />
          <Route path="/incidents/:incidentId/breakout" element={<BreakoutRoomPage />} />
          <Route path="/incidents/:incidentId/summary" element={<IncidentSummaryPage />} />

          <Route path="/contacts" element={<ContactsPage />} />
          <Route path="/medical" element={<MedicalProfilePage />} />

          <Route path="/drills" element={<DrillsHubPage />} />
          <Route path="/drills/session/:sessionId" element={<DrillSessionPage />} />
          <Route path="/skill-verification" element={<SkillVerificationPage />} />

          <Route path="/knowledge" element={<KnowledgeLibraryPage />} />
          <Route path="/knowledge/:articleId" element={<ArticleDetailPage />} />

          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Placeholder title="Not found" phase="—" />} />
      </Routes>
    </Suspense>
  );
}
