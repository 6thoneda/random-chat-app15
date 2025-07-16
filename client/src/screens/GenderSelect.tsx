import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { doc, getDoc, updateDoc, collection, query, where, getDocs, increment, serverTimestamp } from "firebase/firestore";
import { firebaseApp, db } from "../firebaseConfig";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

export default function GenderSelect() {
  const navigate = useNavigate();
  const auth = getAuth(firebaseApp);
  const [selectedGender, setSelectedGender] = useState<string | null>(null);
  const [referralCodeInput, setReferralCodeInput] = useState('');
  const [referralError, setReferralError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingGender, setIsCheckingGender] = useState(true);

  const genderOptions = [
    { value: 'female', label: 'Female', emoji: '👩' },
    { value: 'male', label: 'Male', emoji: '👨' },
    { value: 'other', label: 'Other', emoji: '🧑' },
  ];

  // Check if gender already selected
  useEffect(() => {
    const checkGenderStatus = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          navigate("/onboarding");
          return;
        }

        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          if (userData.onboardingComplete && userData.gender && userData.gender !== 'other') {
            // Onboarding complete and gender already selected, redirect to home
            navigate("/");
            return;
          }
        }
      } catch (error) {
        console.error("Error checking gender status:", error);
      } finally {
        setIsCheckingGender(false);
      }
    };

    checkGenderStatus();
  }, [navigate, auth]);

  const handleContinue = async () => {
    if (!selectedGender || isLoading) return;
    
    if (isLoading) return;
    
    setIsLoading(true);
    setReferralError('');
    
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No authenticated user found');
      }

      const userDocRef = doc(db, "users", user.uid);
      
      // Fetch current user's data to check referredBy status
      const userDocSnap = await getDoc(userDocRef);
      if (!userDocSnap.exists()) {
        throw new Error('User document not found');
      }
      
      const currentUserData = userDocSnap.data();
      let updateData: any = {
        gender: selectedGender,
        onboardingComplete: true,
        updatedAt: serverTimestamp()
      };
      
      // Process referral code if provided
      if (referralCodeInput.trim()) {
        const referralCode = referralCodeInput.trim();
        
        // Query for user with matching ownReferralCode
        const referrerQuery = query(
          collection(db, "users"),
          where("ownReferralCode", "==", referralCode)
        );
        
        const referrerSnapshot = await getDocs(referrerQuery);
        
        if (referrerSnapshot.empty) {
          setReferralError("Invalid referral code.");
          return;
        }
        
        const referrerDoc = referrerSnapshot.docs[0];
        const referrerUid = referrerDoc.id;
        
        // Check for self-referral
        if (referrerUid === user.uid) {
          setReferralError("You cannot use your own referral code.");
          return;
        }
        
        // Check if user hasn't been referred before
        if (currentUserData.referredBy === null) {
          // Grant 24h premium
          const premiumExpiryTime = Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000);
          
          // Update current user with referral info and premium
          updateData.referredBy = referrerUid;
          updateData.premiumUntil = premiumExpiryTime;
          updateData.referralCode = referralCode;
          updateData.referredAt = serverTimestamp();
          
          // Increment referrer's count
          await updateDoc(doc(db, "users", referrerUid), {
            referralCount: increment(1)
          });
        } else {
          setReferralError("You have already been referred by someone else.");
          return;
        }
      }
      
      // Update current user's document
      await setDoc(userDocRef, updateData, { merge: true });

      console.log('User data updated in Firestore:', updateData);
      navigate("/");
    } catch (error) {
      console.error("Error updating user data:", error);
      setReferralError('Error saving your information. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingGender) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen w-full bg-gradient-to-br from-pink-50 via-rose-100 to-fuchsia-100 px-4 py-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500 mx-auto mb-4"></div>
          <p className="text-rose-600 font-medium">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen w-full bg-gradient-to-br from-pink-50 via-rose-100 to-fuchsia-100 px-4 py-6">
      <div className="w-full max-w-xs bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center">
        <h2 className="text-xl font-bold text-rose-600 mb-4 text-center">Complete Your Profile</h2>
        
        {/* Gender Selection */}
        <div className="w-full mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">Select Your Gender</label>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setSelectedGender("female")}
              className={`w-full py-3 rounded-xl font-bold text-base transition-all ${
                selectedGender === "female"
                  ? 'bg-rose-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-rose-100'
              }`}
              disabled={isLoading}
            >
              👩 Female
            </button>
            <button
              onClick={() => setSelectedGender("male")}
              className={`w-full py-3 rounded-xl font-bold text-base transition-all ${
                selectedGender === "male"
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-blue-100'
              }`}
              disabled={isLoading}
            >
              👨 Male
            </button>
            <button
              onClick={() => setSelectedGender("other")}
              className={`w-full py-3 rounded-xl font-bold text-base transition-all ${
                selectedGender === "other"
                  ? 'bg-gray-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              disabled={isLoading}
            >
              🧑 Other
            </button>
          </div>
        </div>

        {/* Referral Code Input */}
        <div className="w-full mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Referral Code (Optional)
          </label>
          <Input
            type="text"
            value={referralCodeInput}
            onChange={(e) => {
              setReferralCodeInput(e.target.value);
              setReferralError(''); // Clear error when user types
            }}
            placeholder="Enter referral code"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-rose-500 focus:border-transparent"
            disabled={isLoading}
            maxLength={10}
          />
          {referralError && (
            <p className="text-red-500 text-xs mt-1">{referralError}</p>
          )}
        </div>

        {/* Continue Button */}
        <div className="w-full">
          <Button 
            className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white font-bold text-base disabled:opacity-50" 
            onClick={handleContinue}
            disabled={isLoading || !selectedGender}
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </div>
            ) : (
              'Continue'
            )}
          </Button>
        </div>
      </div>
    </main>
  );
}