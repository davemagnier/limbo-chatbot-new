/**
 * Interface for conversation history messages
 */
export interface ConversationMessage {
  /**
   * The role of the message sender (e.g., "user", "assistant")
   */
  role: string;
  
  /**
   * The content of the message
   */
  content: string;
}

/**
 * Interface for personality configuration
 */
export interface Personality {
  /**
   * Character backstory and identity
   */
  backstory?: string;
  
  /**
   * Key personality traits
   */
  traits?: string;
  
  /**
   * Helpfulness level (0-100)
   */
  helpfulness?: number;
  
  /**
   * Sarcasm level (0-100)
   */
  sarcasm?: number;
  
  /**
   * Enthusiasm level (0-100)
   */
  enthusiasm?: number;
  
  /**
   * Conversational awareness level (0-100)
   */
  awareness?: number;
}

/**
 * Interface for behavior configuration
 */
export interface Behavior {
  /**
   * Primary rules for interaction
   */
  primaryRules?: string;
  
  /**
   * Examples of how responses should look
   */
  responseExamples?: string;
}

/**
 * Knowledge configuration structure
 */
export interface KnowledgeSettings {
  /**
   * Primary text dump knowledge base
   */
  textDump?: string;
  
  /**
   * Ecosystem facts and information
   */
  ecosystemFacts?: string;
  
  /**
   * Important links and resources
   */
  importantLinks?: string;
}

/**
 * Document structure for uploaded documents
 */
export interface Document {
  /**
   * Name of the document
   */
  name: string;
  
  /**
   * Content of the document
   */
  content: string;
}

/**
 * Main request body interface for the chat API
 */
export interface ChatRequest {
  /**
   * User's input prompt
   */
  prompt: string;
  
  /**
   * Knowledge base content to reference
   */
  knowledge?: string;
  
  /**
   * Personality configuration
   */
  personality?: Personality;
  
  /**
   * Behavior configuration
   */
  behavior?: Behavior;
  
  /**
   * Previous conversation history
   */
  conversationHistory?: ConversationMessage[];
}

/**
 * Admin settings structure used in the frontend
 */
export interface AdminSettings {
  /**
   * Personality configuration
   */
  personality: Personality;
  
  /**
   * Knowledge configuration
   */
  knowledge: KnowledgeSettings;
  
  /**
   * Behavior configuration
   */
  behavior: Behavior;
  
  /**
   * Array of uploaded documents
   */
  documents: Document[];
}

/**
 * Image generation request interface
 */
export interface ImageRequest {
  /**
   * Prompt for image generation
   */
  prompt: string;
}