import React, { useState } from "react";
import { Mail, ArrowRight, Lock, User, AlertCircle } from "lucide-react";
import WanderWayLogo from "./Logo";
import { useAuth } from "../hooks/useAuth";

interface LoginViewProps {
  onLoginSuccess: (user: { email: string; name: string; avatar: string }) => void;
}

/**
 * Maps Firebase Auth error codes to human-readable messages.
 * Prevents leaking internal error details to the user.
 */
function getFirebaseErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code;
  switch (code) {
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/user-disabled":
      return "This account has been disabled. Contact support.";
    case "auth/user-not-found":
      return "No account found with this email. Try signing up.";
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Invalid email or password. Please try again.";
    case "auth/email-already-in-use":
      return "This email is already registered. Try signing in.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/popup-closed-by-user":
      return "Google Sign-In was cancelled. Please try again.";
    case "auth/popup-blocked":
      return "Pop-up was blocked by your browser. Please allow pop-ups and try again.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    default:
      return "Authentication failed. Please try again.";
  }
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { loginWithEmail, signupWithEmail, signInWithGoogle } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (authMode === "login") {
        await loginWithEmail(emailInput, passwordInput);
      } else {
        await signupWithEmail(emailInput, passwordInput, nameInput);
      }
      // onAuthStateChanged in useAuth will update the user state,
      // which App.tsx will detect and transition to the dashboard.
      // We don't need to call onLoginSuccess here — App handles it reactively.
    } catch (error) {
      console.error("Firebase auth error:", error);
      setErrorMessage(getFirebaseErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await signInWithGoogle();
      // Firebase onAuthStateChanged handles the state transition
    } catch (error) {
      console.error("Google Sign-In error:", error);
      setErrorMessage(getFirebaseErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="login-screen" className="min-h-screen w-full bg-[#FAFAF7] flex items-center justify-center p-4">
      {/* Main Container */}
      <main className="w-full max-w-[460px] bg-white rounded-[24px] shadow-xl border border-slate-200 overflow-hidden flex flex-col relative">
        
        {/* Top Graphic Banner with a premium clean gradient */}
        <div className="relative h-60 bg-gradient-to-tr from-emerald-50/60 via-teal-50/50 to-sky-100/40 overflow-hidden flex items-center justify-center pt-6 pb-2">
          {/* Subtle geometric circles for modern abstract visual depth */}
          <div className="absolute top-[-20%] left-[-10%] w-60 h-60 rounded-full bg-emerald-200/20 blur-2xl"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-60 h-60 rounded-full bg-sky-200/20 blur-2xl"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent"></div>
          
          <div className="relative z-10 flex flex-col items-center">
            <WanderWayLogo size={80} showText={true} />
            <p className="font-sans text-[11px] text-slate-500 font-medium mt-2">
              Your AI-powered collaborative travel companion.
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-8 pt-4 flex flex-col gap-5 bg-white rounded-t-[24px] relative z-10 -mt-6">
          <div className="text-center">
            <h2 className="font-display text-lg font-bold text-slate-900">
              {authMode === "login" ? "Welcome back" : "Create Account"}
            </h2>
            <p className="font-sans text-xs text-slate-500 mt-1">
              {authMode === "login" 
                ? "Sign in to continue planning your next adventure." 
                : "Register to collaborate and plan trips with friends."}
            </p>
          </div>

          {/* Styled Tab Toggles for Login / Signup modes */}
          <div className="flex p-1 bg-slate-100 rounded-xl w-full relative">
            <div 
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-lg shadow-sm transition-transform duration-300 ease-in-out ${
                authMode === "signup" ? "translate-x-[100%]" : "translate-x-0"
              }`}
            ></div>
            
            <button 
              id="tab-btn-login"
              type="button"
              onClick={() => {
                setAuthMode("login");
                setErrorMessage(null);
              }}
              className={`flex-1 relative z-10 py-2.5 font-sans font-semibold text-xs transition-colors duration-200 cursor-pointer ${
                authMode === "login" ? "text-slate-800" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              Sign In
            </button>
            <button 
              id="tab-btn-signup"
              type="button"
              onClick={() => {
                setAuthMode("signup");
                setErrorMessage(null);
              }}
              className={`flex-1 relative z-10 py-2.5 font-sans font-semibold text-xs transition-colors duration-200 cursor-pointer ${
                authMode === "signup" ? "text-slate-800" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Error Message Box */}
          {errorMessage && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-start gap-2.5 text-xs text-red-600 animate-fade-in">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Forms Area */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {authMode === "signup" && (
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input 
                  id="name-input-field"
                  type="text"
                  required
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Full name"
                  className="w-full bg-slate-50 rounded-xl py-3.5 pl-12 pr-4 border border-transparent focus:border-[#4FA8E0] focus:bg-white focus:ring-0 focus:outline-none transition-all font-sans text-sm text-slate-800 placeholder:text-slate-400"
                />
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input 
                id="email-input-field"
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="Email address"
                className="w-full bg-slate-50 rounded-xl py-3.5 pl-12 pr-4 border border-transparent focus:border-[#4FA8E0] focus:bg-white focus:ring-0 focus:outline-none transition-all font-sans text-sm text-slate-800 placeholder:text-slate-400"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input 
                id="password-input-field"
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Password"
                className="w-full bg-slate-50 rounded-xl py-3.5 pl-12 pr-4 border border-transparent focus:border-[#4FA8E0] focus:bg-white focus:ring-0 focus:outline-none transition-all font-sans text-sm text-slate-800 placeholder:text-slate-400"
              />
            </div>

            {/* Custom CTA Action Button */}
            <button 
              id="btn-login-submit"
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-[#FF8A65] to-[#FFB74D] text-white py-3.5 rounded-xl font-display font-semibold text-sm shadow-md shadow-orange-100 hover:shadow-lg hover:shadow-orange-200 hover:-translate-y-0.5 active:translate-y-0 transition-all flex justify-center items-center gap-2 group cursor-pointer disabled:opacity-85"
            >
              <span>{isSubmitting ? "Processing..." : authMode === "login" ? "Sign In" : "Sign Up"}</span>
              <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          {/* Social or SSO login option */}
          <div className="flex flex-col gap-4 mt-1">
            <div className="flex items-center w-full gap-4">
              <div className="h-px bg-slate-100 flex-1"></div>
              <span className="font-sans text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
                Or continue with
              </span>
              <div className="h-px bg-slate-100 flex-1"></div>
            </div>

            <button 
              id="google-login-btn"
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-3 py-3 border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-colors font-sans font-medium text-sm text-slate-700 cursor-pointer disabled:opacity-85"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
              </svg>
              <span>Google SSO Sign-In</span>
            </button>
          </div>

          {/* Firebase auth helper tip */}
          <div className="text-center bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-[10px] text-slate-400">
            🔐 Firebase Authentication active. Register a new account or sign in with Google SSO.
          </div>

          {/* Footer Terms */}
          <p className="text-center font-sans text-[10px] text-slate-400 leading-relaxed">
            By continuing, you agree to our{" "}
            <a href="#" className="text-[#4FA8E0] hover:underline">Terms of Service</a>{" "}
            and{" "}
            <a href="#" className="text-[#4FA8E0] hover:underline">Privacy Policy</a>.
          </p>
        </div>
      </main>
    </div>
  );
}
