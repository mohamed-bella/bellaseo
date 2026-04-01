/**
 * Branding Configuration
 * Centralized identity for the SEO Engine.
 */

export const BRANDING = {
  name: "SEO Engine",
  tagline: "24/7 AI-driven content factory",
  companyName: "SignGaze OS Studio",
  
  // Design Tokens (CSS Overrides happen in globals.css)
  primaryColor: "#FF6B00", // Vibrant Orange
  accentColor: "#7C3AED",  // Purple
  
  // Visual Assets
  logo: {
    // We use a Lucide icon as a base, but can be replaced with an image path
    iconName: "TrendingUp", 
    imagePath: null, // Set to "/logo.png" to override icon
  },
  
  // Theme Overrides
  font: {
    family: "Plus Jakarta Sans", // Next.js font name
    importName: "Plus_Jakarta_Sans",
  }
};
