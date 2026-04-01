import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from "react";
import Loading from "../components/Loading";

interface LoadingType {
  isLoading: boolean;
  setIsLoading: (state: boolean) => void;
  setLoading: (percent: number) => void;
}

export const LoadingContext = createContext<LoadingType | null>(null);

// Detect actual mobile/touch devices — catches phones in desktop mode too
const isMobileDevice = () =>
  /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
  window.innerWidth <= 768;

export const LoadingProvider = ({ children }: PropsWithChildren) => {
  const [isLoading, setIsLoading] = useState(() => {
    // Skip loading screen on real mobile devices (including desktop-mode phones)
    if (isMobileDevice()) return false;
    return true;
  });
  const [loading, setLoading] = useState(0);

  const value = {
    isLoading,
    setIsLoading,
    setLoading,
  };
  useEffect(() => {
    // Auto-start animations on mobile since there's no 3D model
    if (isMobileDevice()) {
      import("../components/utils/initialFX").then((module) => {
        if (module.initialFX) {
          // 800ms gives lazy components time to fully mount before GSAP targets their DOM
          setTimeout(() => {
            module.initialFX();
          }, 800);
        }
      });
    }
  }, []);

  useEffect(() => {}, [loading]);

  return (
    <LoadingContext.Provider value={value as LoadingType}>
      {isLoading && <Loading percent={loading} />}
      <main className="main-body">{children}</main>
    </LoadingContext.Provider>
  );
};

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error("useLoading must be used within a LoadingProvider");
  }
  return context;
};
