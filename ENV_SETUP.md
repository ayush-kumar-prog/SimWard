# Environment Variables Setup

## Required Setup

Create a `.env.local` file in the root directory with the following variables:

```bash
# SimWard Environment Variables

# =============================================================================
# GEMINI AI CONFIGURATION (Required)
# =============================================================================
# Get your API key from: https://makersuite.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here

# =============================================================================
# SUPABASE CONFIGURATION (Optional - for production persistence)
# =============================================================================
# Get these from your Supabase project settings
# Leave blank to use localStorage for MVP
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# =============================================================================
# APPLICATION CONFIGURATION (Optional)
# =============================================================================
# Set to 'development' or 'production'
NODE_ENV=development

# Base URL for the application (used in production)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Getting Your Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key and paste it as the value for `GEMINI_API_KEY`

## Optional: Supabase Setup

If you want to use Supabase for production persistence instead of localStorage:

1. Create a free account at [Supabase](https://supabase.com)
2. Create a new project
3. Go to Project Settings > API
4. Copy the "Project URL" to `NEXT_PUBLIC_SUPABASE_URL`
5. Copy the "anon/public" key to `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## MVP Configuration

For the MVP (Phase 1-8), you only need `GEMINI_API_KEY`. The application will use localStorage for data persistence.

