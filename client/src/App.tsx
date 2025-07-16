import "./App.css";
import { Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import { getAuth, signInAnonymously, User } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { firebaseApp, db } from "./firebaseConfig";

import VideoChat from "./screens/VideoChat";
import SplashScreen from "./components/SplashScreen";
import OnboardingScreen from "./screens/OnboardingScreen";
import ReferToUnlock from "./screens/ReferToUnlock";
import ReferralCodeScreen from "./screens/ReferralCode";
import GenderSelect from "./screens/GenderSelect";
import ChatPage from "./screens/ChatPage";
import VoicePage from "./screens/VoicePage";
import HomePage from "./screens/HomePage";
import ProfilePage from "./screens/ProfilePage";
import UserSetup from "./screens/UserSetup";
import PersonalChat from "./screens/PersonalChat";
import FriendsPage from "./screens/FriendsPage";
import AIChatbotPage from "./screens/AIChatbotPage";

import { useNavigate } from "react-router-dom";

interface UserData {
  uid: string;
  onboardingComplete: boolean;
  gender?: string | null;
  referralCode?: string | null;
  referredBy?: string | null;
  ownReferralCode: string;
  referralCount: number;
  premiumUntil?: Timestamp | null;
  createdAt: Timestamp;
  username?: string | null;
  language: string;
  referredAt?: any;
}

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const auth = getAuth(firebaseApp);

  useEffect(() => {
    if (!showSplash) {
      const initializeUser = async () => {
        try {
          // Sign in anonymously with Firebase
          const userCredential = await signInAnonymously(auth);
          const user = userCredential.user;
          console.log("Signed in anonymously with UID:", user.uid);

          // Check if user document exists in Firestore
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (!userDocSnap.exists()) {
            // New user - create document with initial data
            const initialUserData: Partial<UserData> = {
              uid: user.uid,
              onboardingComplete: false,
              gender: null,
              username: null,
              language: 'en', // Default language
              referredBy: null,
              referralId: generateUniqueReferralId(),
              referralCount: 0,
              createdAt: new Date()
            };

            await setDoc(userDocRef, initialUserData);
            console.log("Created new user document");
            
            // Redirect to onboarding for new users
            navigate("/onboarding", { replace: true });
          } else {
            // Existing user - check onboarding status
            const userData = userDocSnap.data() as UserData;
            console.log("Existing user data:", userData);

            // Backfill referralId and referralCount for existing users
            const updateFields: Partial<UserData> = {};
            if (!userData.referralId) {
              updateFields.referralId = generateUniqueReferralId();
            }
            if (typeof userData.referralCount !== 'number') {
              updateFields.referralCount = 0;
            }
            
            // Update document if any fields need to be backfilled
            if (Object.keys(updateFields).length > 0) {
              await updateDoc(userDocRef, updateFields);
              console.log("Backfilled missing fields:", updateFields);
            }
          }

          if (userData.referredBy === undefined) {
            updateFields.referredBy = null;
          }
          if (userData.referralCode === undefined) {
            updateFields.referralCode = null;
          }
          if (userData.premiumUntil === undefined) {
            updateFields.premiumUntil = null;
          }
          if (!userData.createdAt) {
            updateFields.createdAt = serverTimestamp();
          }
            if (!userData.onboardingComplete) {
            }
          // Backfill missing fields for existing users
              navigate("/onboarding", { replace: true });
          if (!userData.ownReferralCode) {
            updateFields.ownReferralCode = user.uid.slice(0, 6);
          }
        } catch (error) {
          console.error("Error during user initialization:", error);
          // Fallback to onboarding on error
          navigate("/onboarding", { replace: true });
        } finally {
          setIsLoading(false);
        }
      };

      initializeUser();
    }
  }, [showSplash, navigate, auth]);

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500 mx-auto mb-4"></div>
          <p className="text-rose-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/onboarding" element={<OnboardingScreen />} />
        <Route path="/user-setup" element={<UserSetup />} />
        <Route path="/premium-trial" element={<ReferToUnlock />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/gender-select" element={<GenderSelect />} />
        <Route path="/video-chat" element={<VideoChat />} />
        <Route path="/voice" element={<VoicePage />} />
        <Route path="/personal-chat" element={<PersonalChat />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/friends" element={<FriendsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/refer" element={<ReferToUnlock />} />
        <Route path="/referral-code" element={<ReferralCodeScreen />} />
        <Route path="/ai-chatbot" element={<AIChatbotPage />} />
      </Routes>
    </div>
  );
}

export default App;