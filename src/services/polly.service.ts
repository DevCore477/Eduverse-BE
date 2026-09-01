import { SynthesizeSpeechCommand, VoiceId } from "@aws-sdk/client-polly";
import { pollyClient } from "../config/polly";

type SupportedLanguage = "en" | "ar" | "fr";

class PollyService {
  private cache = new Map<string, string>();

  private getVoice(language: SupportedLanguage): VoiceId {
    switch (language) {
      case "ar":
        return "Zeina";
      case "fr":
        return "Lea";
      case "en":
      default:
        return "Joanna";
    }
  }

  async synthesize(text: string, language: SupportedLanguage = "en") {
    const voice = this.getVoice(language);

    const cacheKey = `${language}:${voice}:${text}`;

    const cachedAudio = this.cache.get(cacheKey);
    if (cachedAudio) {
      console.log("🟢 Polly cache HIT");
      return cachedAudio;
    }

    console.log("🔵 Polly cache MISS – calling AWS Polly");

    const command = new SynthesizeSpeechCommand({
      Text: text,
      OutputFormat: "mp3",
      VoiceId: voice,
      Engine: language == "ar"
              ? "standard"
              : "neural"
    });

    const response = await pollyClient.send(command);

    if (!response.AudioStream) {
      throw new Error("No audio stream returned from Polly");
    }

    const audioBytes = await response.AudioStream.transformToByteArray();
    const audioBase64 = Buffer.from(audioBytes).toString("base64");

    this.cache.set(cacheKey, audioBase64);

    return audioBase64;
  }
}

export const pollyService = new PollyService();
