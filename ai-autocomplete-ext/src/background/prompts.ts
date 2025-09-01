/**
 * System Prompts Configuration File
 * 
 * This file contains all system prompts used by the AI Autocomplete extension.
 * Separated from main logic for easier maintenance and future enhancements.
 * 
 * FUTURE ENHANCEMENT NOTES:
 * - This file is designed to support dynamic prompt generation in the future
 * - Planned feature: AI-driven prompt optimization based on user's accepted completions
 * - The prompts can be updated programmatically by analyzing user's writing style
 * - Consider implementing a prompt versioning system for A/B testing
 * - Could store user-specific prompt variations in chrome.storage.local
 * 
 * To modify prompts:
 * 1. Edit the prompt strings below
 * 2. Run `npm run build` to apply changes
 * 3. Reload the extension in Chrome
 */

/**
 * Completion mode type definition
 */
export type CompletionMode = 'short' | 'medium' | 'long';

/**
 * Token limits for each mode
 */
export const MODE_TOKEN_LIMITS: Record<CompletionMode, number> = {
  short: 100,
  medium: 200,
  long: 400
};

/**
 * SHORT MODE PROMPT - Brief completions (5-20 words)
 * Completes the current thought with a short phrase or finishes the sentence
 */
export const SHORT_MODE_PROMPT = `PURPOSE: You are a text completion assistant. Your job is to CONTINUE/COMPLETE the given text with SHORT, CONCISE completions. Each completion should be a brief phrase or sentence ending (5-20 words).

EXAMPLES:
Input: "The weather today is"
CORRECT completions: ["sunny and warm", "perfect for outdoor activities", "quite cold", "absolutely beautiful", "cloudy with light rain"]

Input: "I'm writing to"
CORRECT completions: ["thank you for your help", "follow up on our meeting", "confirm our appointment", "express my gratitude", "request more information"]

CRITICAL INSTRUCTIONS:
1. Generate exactly 5 different SHORT text completions
2. Each completion should be 5-20 words maximum
3. Focus on completing the immediate thought or sentence
4. Return ONLY a valid JSON array

FORMAT: ["short completion 1", "short completion 2", "short completion 3", "short completion 4", "short completion 5"]`;

/**
 * NUMBERED LIST PROMPT - Simple numbered format for better reliability
 * Used for models that struggle with JSON format
 */
export const NUMBERED_LIST_PROMPT_SHORT = `Complete the given text with 5 short continuations (5-20 words each). Output each on a new line, numbered 1-5.

EXAMPLES:
Input: "The weather today is"
Output:
1. sunny and warm
2. perfect for outdoor activities
3. quite cold
4. absolutely beautiful
5. cloudy with light rain

INSTRUCTIONS: Generate exactly 5 different completions, each 5-20 words.`;

/**
 * MEDIUM MODE PROMPT - Two-sentence completions (20-40 words)
 * Completes current sentence and adds one more
 */
export const MEDIUM_MODE_PROMPT = `PURPOSE: You are a text completion assistant. Your job is to CONTINUE the given text with MEDIUM-LENGTH completions. Complete the current thought and add one additional sentence (20-40 words total).

EXAMPLES:
Input: "The weather today is"
CORRECT completions: [
  "perfect for a long walk. The sun is shining brightly and there's a gentle breeze.",
  "quite unpredictable with clouds gathering. We might see some rain later this afternoon.",
  "absolutely beautiful outside. It's the kind of day that makes you want to skip work.",
  "colder than expected for this time of year. I'll need to grab my warm jacket before heading out.",
  "ideal for our outdoor picnic plans. The temperature is just right and there's no rain in the forecast."
]

Input: "I've been thinking about"
CORRECT completions: [
  "taking up a new hobby to expand my skills. Photography has always fascinated me and now seems like the perfect time.",
  "changing careers to pursue my passion. The corporate world has been draining and I want to do something more meaningful.",
  "our conversation from yesterday all day. You made some really valid points that I hadn't considered before.",
  "renovating the kitchen for months now. It's time to finally start planning and getting quotes from contractors.",
  "learning a new language to challenge myself. Spanish would be useful for both travel and business opportunities."
]

CRITICAL INSTRUCTIONS:
1. Generate exactly 5 different MEDIUM-LENGTH text completions
2. Each should complete the current sentence PLUS add one more sentence
3. Aim for 20-40 words per completion
4. Maintain natural flow between sentences
5. Return ONLY a valid JSON array

FORMAT: ["medium completion 1", "medium completion 2", "medium completion 3", "medium completion 4", "medium completion 5"]`;

/**
 * LONG MODE PROMPT - Paragraph completions (50-100 words)
 * Completes or writes a full paragraph with natural flow
 */
export const LONG_MODE_PROMPT = `PURPOSE: You are a text completion assistant. Your job is to CONTINUE the given text with LONG, PARAGRAPH-LENGTH completions. Write a complete paragraph that flows naturally from the input (50-100 words).

EXAMPLES:
Input: "The weather today is"
CORRECT completions: [
  "absolutely perfect for spending time outdoors. The temperature hovers around a comfortable 72 degrees with a gentle breeze that carries the sweet scent of blooming flowers. The sky is a brilliant blue with just a few wispy clouds drifting lazily overhead. It's the kind of day that makes you want to call in sick to work and spend every moment soaking up the sunshine. Later this afternoon, I'm planning to take a long walk through the park.",
  "quite unusual for this time of year, with unexpected warmth breaking through what should be autumn's chill. The meteorologists are calling it an anomaly, but everyone seems to be embracing this surprise gift from nature. People are out in droves, wearing shorts and t-shirts instead of the sweaters they had prepared. The local ice cream shops are seeing lines they haven't had since August. It makes you wonder if climate patterns are shifting more dramatically than we realize.",
  "perfectly reflecting my mood - gray, overcast, and threatening rain at any moment. Sometimes the weather seems to mirror our inner emotional state, creating a symphony of melancholy that's oddly comforting. The heavy clouds hang low, creating an intimate atmosphere that makes the world feel smaller and cozier. I've decided to embrace it by making a cup of tea and settling in with a good book. There's something therapeutic about accepting the gloom rather than fighting it."
]

CRITICAL INSTRUCTIONS:
1. Generate exactly 5 different PARAGRAPH-LENGTH text completions
2. Each should be a full, coherent paragraph (50-100 words)
3. Develop the thought completely with natural progression
4. Include multiple related sentences that flow together
5. Return ONLY a valid JSON array

FORMAT: ["long completion 1", "long completion 2", "long completion 3", "long completion 4", "long completion 5"]`;

/**
 * NUMBERED LIST PROMPT - MEDIUM - Simple numbered format for better reliability
 * Used for models that struggle with JSON format
 */
export const NUMBERED_LIST_PROMPT_MEDIUM = `Complete the given text with 5 medium-length continuations (20-40 words each). Each should complete the current sentence and add one more. Output each on a new line, numbered 1-5.

INSTRUCTIONS: Generate exactly 5 different completions, each 20-40 words.`;

/**
 * NUMBERED LIST PROMPT - LONG - Simple numbered format for better reliability
 * Used for models that struggle with JSON format
 */
export const NUMBERED_LIST_PROMPT_LONG = `Complete the given text with 5 paragraph-length continuations (50-100 words each). Each should be a full, coherent paragraph. Output each on a new line, numbered 1-5.

INSTRUCTIONS: Generate exactly 5 different paragraph completions, each 50-100 words.`;

/**
 * Legacy prompt for backward compatibility (same as SHORT mode)
 */
export const MULTIPLE_COMPLETIONS_PROMPT = SHORT_MODE_PROMPT;

/**
 * Prompt for generating a single completion
 * Used as a fallback or for models that struggle with JSON array format
 * 
 * This simpler prompt is more compatible with various models
 */
export const SINGLE_COMPLETION_PROMPT = `Continue the following text naturally. Provide only the continuation without any introduction or explanation. Complete the thought or sentence in a natural way.`;

/**
 * Get the mode-specific prompt
 */
export function getModePrompt(mode: CompletionMode): string {
  switch (mode) {
    case 'short':
      return SHORT_MODE_PROMPT;
    case 'medium':
      return MEDIUM_MODE_PROMPT;
    case 'long':
      return LONG_MODE_PROMPT;
    default:
      return SHORT_MODE_PROMPT;
  }
}

/**
 * Get the numbered list prompt for a specific mode
 */
export function getNumberedListPrompt(mode: CompletionMode): string {
  switch (mode) {
    case 'short':
      return NUMBERED_LIST_PROMPT_SHORT;
    case 'medium':
      return NUMBERED_LIST_PROMPT_MEDIUM;
    case 'long':
      return NUMBERED_LIST_PROMPT_LONG;
    default:
      return NUMBERED_LIST_PROMPT_SHORT;
  }
}

/**
 * Get the appropriate system prompt based on requirements
 * 
 * @param customPrompt - Optional custom prompt from user settings
 * @param multipleCompletions - Whether to request multiple completions (5) or single
 * @param mode - The completion mode (short/medium/long)
 * @param isPremiumUser - Whether the user has premium access (default true for now)
 * @returns The system prompt to use for the AI model
 * 
 * PREMIUM FEATURE:
 * Custom system prompts are a premium feature. When ExtensionPay is integrated:
 * - Free users: Custom prompts will be ignored
 * - Premium users: Custom prompts will be prepended as "User Style Preferences"
 * 
 * FUTURE ENHANCEMENT:
 * This function could be enhanced to:
 * - Load user-specific prompts from storage
 * - Apply learned writing style patterns
 * - A/B test different prompt variations
 * - Adjust based on the type of content being completed (code vs prose vs email etc.)
 */
export function getSystemPrompt(
  customPrompt?: string, 
  multipleCompletions: boolean = false, 
  mode: CompletionMode = 'short',
  _isPremiumUser: boolean = true // TODO: Replace with actual premium check when ExtensionPay is integrated
): string {
  // Get the base prompt based on mode
  const basePrompt = multipleCompletions ? getModePrompt(mode) : SINGLE_COMPLETION_PROMPT;
  
  // If user has provided a custom prompt, append it as User Style Preferences
  if (customPrompt && customPrompt.trim()) {
    // TODO: When implementing freemium model, uncomment this check:
    // if (!_isPremiumUser) {
    //   console.log('Custom prompts are a premium feature');
    //   return basePrompt;
    // }
    
    // Construct the enhanced prompt with user preferences
    const userStyleSection = `USER STYLE PREFERENCES:
${customPrompt.trim()}

IMPORTANT: Apply the above style preferences while following the core instructions below.

---

`;
    
    // Append user preferences before the base prompt
    return userStyleSection + basePrompt;
  }
  
  // No custom prompt or empty prompt - use base prompt
  return basePrompt;
}

/**
 * DYNAMIC PROMPT LEARNING SYSTEM (Future Implementation)
 * 
 * Proposed implementation for learning from user's writing style:
 * 
 * 1. Track accepted completions vs rejected ones
 * 2. Analyze patterns in accepted completions:
 *    - Average length
 *    - Formality level
 *    - Common phrases
 *    - Punctuation style
 *    - Technical vs casual language
 * 
 * 3. Generate optimized prompts based on patterns:
 *    - "Generate completions in a [formal/casual/technical] style"
 *    - "Keep completions around [X] words"
 *    - "Use [active/passive] voice"
 *    - "Include [technical terms/simple language]"
 * 
 * 4. Store user-specific prompt modifications:
 *    chrome.storage.local.set({ 
 *      userPromptModifiers: {
 *        style: 'formal',
 *        avgLength: 15,
 *        techLevel: 'high'
 *      }
 *    });
 * 
 * 5. Apply modifications dynamically:
 *    const userModifiers = await getUserPromptModifiers();
 *    const enhancedPrompt = applyUserStyle(basePrompt, userModifiers);
 */

// Placeholder for future dynamic prompt generation
export interface UserWritingProfile {
  averageCompletionLength: number;
  formalityLevel: 'casual' | 'neutral' | 'formal';
  technicalLevel: 'simple' | 'moderate' | 'technical';
  preferredPunctuation: string[];
  commonPhrases: string[];
  acceptanceRate: number;
}

// Placeholder for future prompt optimization
export async function generateOptimizedPrompt(
  basePrompt: string, 
  _userProfile?: UserWritingProfile
): Promise<string> {
  // TODO: Implement dynamic prompt generation based on user profile
  // For now, just return the base prompt
  // The underscore prefix indicates this parameter will be used in future
  return basePrompt;
}

/**
 * REWRITE PROMPT - Text improvement and grammar checking
 * Rewrites selected text with better grammar, clarity, and flow
 */
export const REWRITE_PROMPT = `PURPOSE: You are a text improvement assistant. Your job is to rewrite the given text with better grammar, clarity, and flow while keeping roughly the same length.

CRITICAL INSTRUCTIONS:
1. Generate exactly 3 different improved versions
2. Fix all grammar and spelling errors
3. Improve clarity and readability
4. Maintain approximately the same length as the original (within 10% variance)
5. Keep the original meaning and tone
6. Preserve any technical terms or proper nouns
7. Return ONLY a valid JSON array with no additional text

FORMAT: ["improved version 1", "improved version 2", "improved version 3"]`;