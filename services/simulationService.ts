
import { GoogleGenAI, Modality } from "@google/genai";
import { decode, decodeAudioData, getCachedAudio, cacheAudio } from "./audioUtils";

export interface SimulationScenario {
  id: string;
  name: string;
  department: string;
  prompt: string;
  transcript: { role: string, text: string, delay: number }[];
}

export const SCENARIOS: SimulationScenario[] = [
  {
    id: 'respiratory_lee',
    name: '李女士 - 持续干咳',
    department: '呼吸科',
    prompt: `TTS the following conversation:
      Dr. Zhang: 您好，李女士，最近感觉怎么样？
      Mrs. Lee: 哎呀张医生，我这咳嗽快两周了，尤其是晚上躺下的时候，咳得厉害，根本睡不着。
      Dr. Zhang: 有没有痰？或者发烧的感觉？
      Mrs. Lee: 不发烧，就是干咳，感觉喉咙里总是有东西。我以前抽烟多，不知道有没有关系。
      Dr. Zhang: 明白了，长期吸烟史加上持续性干咳，我们需要警惕慢性支气管炎的风险。`,
    transcript: [
      { role: 'Doctor', text: '您好，李女士，最近感觉怎么样？', delay: 0 },
      { role: 'Patient', text: '哎呀张医生，我这咳嗽快两周了，尤其是晚上躺下的时候，咳得厉害，根本睡不着。', delay: 3000 },
      { role: 'Doctor', text: '有没有痰？或者发烧的感觉？', delay: 8500 },
      { role: 'Patient', text: '不发烧，就是干咳，感觉喉咙里总是有东西。我以前抽烟多，不知道有没有关系。', delay: 11500 },
      { role: 'Doctor', text: '明白了，长期吸烟史加上持续性干咳，我们需要警惕慢性支气管炎的风险。', delay: 18000 }
    ]
  },
  {
    id: 'cardio_sun',
    name: '孙大爷 - 头晕心悸',
    department: '心血管',
    prompt: `TTS the following conversation:
      Dr. Wang: 孙大爷，降压药最近按时吃了吗？
      Mr. Sun: 吃了，但最近总觉得头晕，尤其是早上起来那会儿。心脏还偶尔突突地跳。
      Dr. Wang: 早上起来头晕？有没有量过血压？
      Mr. Sun: 量了，高压160多，低压也有100。我这几天还吃了不少咸菜，不知道是不是盐吃多了。
      Dr. Wang: 盐分摄入过高是主要诱因，而且160的血压很高了，我们得调整用药方案。`,
    transcript: [
      { role: 'Doctor', text: '孙大爷，降压药最近按时吃了吗？', delay: 0 },
      { role: 'Patient', text: '吃了，但最近总觉得头晕，尤其是早上起来那会儿。心脏还偶尔突突地跳。', delay: 3500 },
      { role: 'Doctor', text: '早上起来头晕？有没有量过血压？', delay: 9000 },
      { role: 'Patient', text: '量了，高压160多，低压也有100。我这几天还吃了不少咸菜，不知道是不是盐吃多了。', delay: 12500 },
      { role: 'Doctor', text: '盐分摄入过高是主要诱因，而且160的血压很高了，我们得调整用药方案。', delay: 20000 }
    ]
  }
];

export class SimulationService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  async getScenarioAudio(scenario: SimulationScenario): Promise<AudioBuffer> {
    const cached = await getCachedAudio(scenario.id);
    let bytes: Uint8Array;

    if (cached) {
      console.log(`Using cached audio for ${scenario.id}`);
      bytes = cached;
    } else {
      console.log(`Generating new TTS for ${scenario.id}`);
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: scenario.prompt }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            multiSpeakerVoiceConfig: {
              speakerVoiceConfigs: [
                { speaker: 'Doctor', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
                { speaker: 'Patient', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } }
              ]
            }
          }
        }
      });

      const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64) throw new Error("TTS failed");
      bytes = decode(base64);
      await cacheAudio(scenario.id, bytes);
    }

    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    return await decodeAudioData(bytes, ctx, 24000, 1);
  }
}
