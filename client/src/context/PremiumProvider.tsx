
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getAuth } from "firebase/auth";
import { doc, getDoc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";

interface PremiumContextType {
  isPremium: boolean;
  premiumExpiry: Date | null;
  setPremium: (premium: boolean, expiry?: Date) => void;
  checkPremiumStatus: () => boolean;
}

const PremiumContext = createContext<PremiumContextType | null>(null);

export const usePremium = () => {
  const context = useContext(PremiumContext);
  if (!context) {
    throw new Error("usePremium must be used within a PremiumProvider");
  }
  return context;
};

interface PremiumProviderProps {
  children: ReactNode;
}

export const PremiumProvider = ({ children }: PremiumProviderProps) => {
  const [isPremium, setIsPremium] = useState(false);
  const [premiumExpiry, setPremiumExpiry] = useState<Date | null>(null);

  // Check premium status on mount
  useEffect(() => {
    const checkPremiumStatus = async () => {
      try {
        const user = getAuth().currentUser;
        if (!user) return;
        
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          const premiumUntil = userData.premiumUntil;
          
          if (premiumUntil && premiumUntil.toMillis() > Date.now()) {
            setIsPremium(true);
            setPremiumExpiry(premiumUntil.toDate());
          } else if (premiumUntil && premiumUntil.toMillis() <= Date.now()) {
            // Premium expired, clear from Firestore
            await updateDoc(userDocRef, { premiumUntil: null });
            setIsPremium(false);
            setPremiumExpiry(null);
          } else {
            setIsPremium(false);
            setPremiumExpiry(null);
          }
        }
      } catch (error) {
        console.error("Error checking premium status:", error);
        setIsPremium(false);
        setPremiumExpiry(null);
      }
    };
    
    checkPremiumStatus();
  }, []);

  const setPremium = async (premium: boolean, expiry?: Date) => {
    try {
      const user = getAuth().currentUser;
      if (!user) return;
      
      const userDocRef = doc(db, "users", user.uid);
      
      if (premium && expiry) {
        const premiumTimestamp = Timestamp.fromDate(expiry);
        await updateDoc(userDocRef, { premiumUntil: premiumTimestamp });
        setPremiumExpiry(expiry);
      } else {
        await updateDoc(userDocRef, { premiumUntil: null });
        setPremiumExpiry(null);
      }
      
      setIsPremium(premium);
    } catch (error) {
      console.error("Error updating premium status:", error);
    }
  };

  const setPremiumSync = (premium: boolean, expiry?: Date) => {
    setIsPremium(premium);
    if (premium && expiry) {
      setPremiumExpiry(expiry);
    } else {
      setPremiumExpiry(null);
    }
  };

  const checkPremiumStatus = async () => {
    try {
      const user = getAuth().currentUser;
      if (!user) return false;
      
      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        const premiumUntil = userData.premiumUntil;
        
        if (premiumUntil && premiumUntil.toMillis() > Date.now()) {
          if (!isPremium) {
            setIsPremium(true);
            setPremiumExpiry(premiumUntil.toDate());
          }
          return true;
        } else if (premiumUntil && premiumUntil.toMillis() <= Date.now()) {
          // Premium expired, clear from Firestore
          await updateDoc(userDocRef, { premiumUntil: null });
          setIsPremium(false);
          setPremiumExpiry(null);
          return false;
        }
      }
    } catch (error) {
      console.error("Error checking premium status:", error);
    }
    
    if (premiumExpiry && new Date() > premiumExpiry) {
      setPremiumSync(false);
      return false;
    }
    return isPremium;
  };

  return (
    <PremiumContext.Provider
      value={{
        isPremium,
        premiumExpiry,
        setPremium,
        checkPremiumStatus,
      }}
    >
      {children}
    </PremiumContext.Provider>
  );
};
