import { useLocalStorage } from "@uidotdev/usehooks";
import { LimboPersonality, LimboPersonalityParams } from "../types/admin";

const LOCAL_STORAGE_KEY = "limboPersonality";
const DEFAULT_PERSONALITY: LimboPersonality = {
  helpfulness: 80,
  enthusiasm: 60,
  awareness: 80,
  sarcasm: 75,
  backstory: "",
  traits: "",
};

export function usePersonality() {
  const [jsonValue, setValue] = useLocalStorage<string | null>(
    LOCAL_STORAGE_KEY,
    null
  );

  let personality: LimboPersonality = DEFAULT_PERSONALITY;
  try {
    personality = JSON.parse(jsonValue ?? "") || DEFAULT_PERSONALITY;
  } catch {}

  const setPersonality = (newPersonality: LimboPersonality) => {
    try {
      setValue(JSON.stringify(newPersonality));
    } catch {}
  };

  return {
    personality,
    setPersonality,
  };
}

export function getPersonality(): LimboPersonality {
  const jsonValue = localStorage.getItem(LOCAL_STORAGE_KEY);
  let personality: LimboPersonality | null = null;
  try {
    personality = JSON.parse(jsonValue ?? "");
  } catch {}

  return personality || DEFAULT_PERSONALITY;
}

export function updatePersonalityParam(
  param: keyof LimboPersonalityParams,
  value: number
) {
  const personality = getPersonality();
  personality[param] = value;
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(personality));
}

export function updatePersonalityBackstory(backstory: string) {
  const personality = getPersonality();
  personality.backstory = backstory;
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(personality));
}

export function updatePersonalityTraits(traits: string) {
  const personality = getPersonality();
  personality.traits = traits;
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(personality));
}

export function updatePersonality(personality: LimboPersonality) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(personality));
}
