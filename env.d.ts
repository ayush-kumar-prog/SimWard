/// <reference types="next" />
/// <reference types="next/image-types/global" />

// Environment variable type definitions for SimWard

declare namespace NodeJS {
  interface ProcessEnv {
    // Required
    GEMINI_API_KEY: string;
    
    // Optional - Supabase
    NEXT_PUBLIC_SUPABASE_URL?: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
    
    // Application
    NODE_ENV: 'development' | 'production' | 'test';
    NEXT_PUBLIC_APP_URL?: string;
  }
}

// Web Speech API types (for browser)
interface Window {
  SpeechRecognition?: typeof SpeechRecognition;
  webkitSpeechRecognition?: typeof SpeechRecognition;
}

