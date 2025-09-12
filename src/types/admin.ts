export type LimboPersonalityParams = {
  awareness: number;
  sarcasm: number;
  helpfulness: number;
  enthusiasm: number;
};

export type LimboPersonality = LimboPersonalityParams & {
  backstory: string;
  traits: string;
};
