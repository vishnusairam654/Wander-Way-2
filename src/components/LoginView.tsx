import React, { useState } from "react";
import { Mail, ArrowRight, Lock, User, AlertCircle, Compass } from "lucide-react";
import { motion } from "motion/react";
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

  const { loginWithEmail, signupWithEmail, signInWithGoogle, authError } = useAuth();

  React.useEffect(() => {
    if (authError) {
      setErrorMessage(getFirebaseErrorMessage(authError));
    }
  }, [authError]);

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
    <div id="login-screen" className="min-h-screen w-full bg-slate-100 flex overflow-hidden p-4 lg:p-6 gap-6">
      {/* Left Pane - Branding */}
      <div className="hidden lg:flex w-[60%] relative flex-col justify-between overflow-hidden rounded-[2rem] shadow-2xl bg-brand-terracotta p-12 lg:p-16">
        
        <div className="relative z-10 flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm border border-white/20">
            <Compass className="w-6 h-6 text-white" />
          </div>
          <span className="font-display text-2xl font-bold tracking-tight text-white">WanderWay</span>
        </div>

        <div className="relative z-10 flex flex-col">
          <h1 className="font-display text-5xl lg:text-6xl font-bold tracking-tight mb-4 text-white leading-tight">
            Plan less. Wander<br />more.
          </h1>
          <p className="font-sans text-lg lg:text-xl text-white/90 max-w-md font-medium leading-relaxed">
            AI itineraries, shared trips, one place to keep it all.
          </p>
        </div>
      </div>

      {/* Right Pane - Auth Form */}
      <div className="w-full lg:w-[40%] flex flex-col justify-center px-6 sm:px-12 lg:px-16 bg-white relative shadow-2xl rounded-[2rem]">
        <div className="w-full max-w-[400px] mx-auto flex flex-col gap-7">
          
          <div className="lg:hidden flex justify-center mb-2">
            <WanderWayLogo size={80} showText={true} />
          </div>

          <div className="text-left">
            <h2 className="font-display text-3xl font-bold text-slate-900 tracking-tight">
              {authMode === "login" ? "Welcome back" : "Create an account"}
            </h2>
            <p className="font-sans text-sm text-slate-500 mt-2">
              {authMode === "login" 
                ? "Sign in to continue planning your next adventure." 
                : "Register to collaborate and plan trips with friends."}
            </p>
          </div>

          {/* Styled Tab Toggles */}
          <div className="flex p-1 bg-slate-100/80 rounded-xl w-full relative">
            <div 
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-lg shadow-sm transition-transform duration-300 ease-out ${
                authMode === "signup" ? "translate-x-[100%]" : "translate-x-0"
              }`}
            ></div>
            
            <button 
              type="button"
              onClick={() => { setAuthMode("login"); setErrorMessage(null); }}
              className={`flex-1 relative z-10 py-2.5 font-sans font-semibold text-xs transition-colors duration-200 cursor-pointer ${
                authMode === "login" ? "text-slate-800" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Sign In
            </button>
            <button 
              type="button"
              onClick={() => { setAuthMode("signup"); setErrorMessage(null); }}
              className={`flex-1 relative z-10 py-2.5 font-sans font-semibold text-xs transition-colors duration-200 cursor-pointer ${
                authMode === "signup" ? "text-slate-800" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Error Message Box */}
          {errorMessage && (
            <div className="bg-red-50/80 border border-red-100 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-red-600 animate-fade-in">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          {/* Forms Area */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {authMode === "signup" && (
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-[#4FA8E0] transition-colors" />
                <input 
                  type="text"
                  required
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Full name"
                  className="w-full bg-slate-50/50 hover:bg-slate-50 rounded-xl py-3.5 pl-12 pr-4 border border-slate-200 focus:border-[#4FA8E0] focus:bg-white focus:ring-4 focus:ring-[#4FA8E0]/10 transition-all font-sans text-sm text-slate-800 placeholder:text-slate-400 outline-none"
                />
              </div>
            )}

            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-[#4FA8E0] transition-colors" />
              <input 
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="Email address"
                className="w-full bg-slate-50/50 hover:bg-slate-50 rounded-xl py-3.5 pl-12 pr-4 border border-slate-200 focus:border-[#4FA8E0] focus:bg-white focus:ring-4 focus:ring-[#4FA8E0]/10 transition-all font-sans text-sm text-slate-800 placeholder:text-slate-400 outline-none"
              />
            </div>

            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-[#4FA8E0] transition-colors" />
              <input 
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Password"
                className="w-full bg-slate-50/50 hover:bg-slate-50 rounded-xl py-3.5 pl-12 pr-4 border border-slate-200 focus:border-[#4FA8E0] focus:bg-white focus:ring-4 focus:ring-[#4FA8E0]/10 transition-all font-sans text-sm text-slate-800 placeholder:text-slate-400 outline-none"
              />
            </div>

            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 bg-gradient-to-r from-[#3B7A57] to-[#4FA8E0] text-white py-3.5 rounded-xl font-display font-semibold text-sm shadow-md shadow-[#4FA8E0]/20 hover:shadow-lg hover:shadow-[#4FA8E0]/30 hover:-translate-y-0.5 active:translate-y-0 transition-all flex justify-center items-center gap-2 group cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <span>{isSubmitting ? "Processing..." : authMode === "login" ? "Sign In" : "Create Account"}</span>
              <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          {/* Social login option */}
          <div className="flex flex-col gap-4 mt-2">
            <div className="flex items-center w-full gap-4">
              <div className="h-px bg-slate-200 flex-1"></div>
              <span className="font-sans text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
                Or continue with
              </span>
              <div className="h-px bg-slate-200 flex-1"></div>
            </div>

            <button 
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-3 py-3.5 border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-colors font-sans font-semibold text-sm text-slate-700 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
              </svg>
              <span>Google</span>
            </button>
          </div>

          <p className="text-center font-sans text-[11px] text-slate-400 mt-4 leading-relaxed">
            By continuing, you agree to our{" "}
            <a href="#" className="text-[#4FA8E0] hover:text-[#3B7A57] transition-colors font-medium">Terms of Service</a>{" "}
            and{" "}
            <a href="#" className="text-[#4FA8E0] hover:text-[#3B7A57] transition-colors font-medium">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
