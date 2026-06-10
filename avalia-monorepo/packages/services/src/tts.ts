import { generateSpeech } from './geminiService';
import { playAudioData, playAudioUrl, stopCurrentAudio } from './audio';
import { TTSConfig, QuizQuestion, AiProvider } from '@avalia/core';

// State to track if we are currently speaking via Gemini Audio
let isSpeakingState = false;

// Fallback legacy Web Speech API for when API Key is missing (should rarely happen in this flow)
let synth: SpeechSynthesis | null = typeof window !== 'undefined' ? window.speechSynthesis : null;

// Helper to construct consistent text for reading
export const getQuestionReadAloudText = (question: QuizQuestion, activeTeamName?: string): string => {
  const teamIntro = activeTeamName ? `Pergunta para ${activeTeamName}. ` : "";
  let textToRead = `${teamIntro}${question.question}.`;
  
  if (question.options && question.options.length > 0) {
    // Check if it is True/False to read naturally
    if (question.options.length === 2 && question.options[0] === "Verdadeiro") {
        textToRead += " Verdadeiro ou Falso?";
    } else {
        textToRead += ` Alternativa A: ${question.options[0]}. Alternativa B: ${question.options[1]}.`;
        if (question.options.length > 2) textToRead += ` Alternativa C: ${question.options[2]}.`;
        if (question.options.length > 3) textToRead += ` Alternativa D: ${question.options[3]}.`;
    }
  } else {
    textToRead += " Digite ou fale sua resposta.";
  }
  return textToRead;
};

export const speakText = async (
  text: string,
  config: TTSConfig,
  apiKey?: string,
  preGeneratedAudio?: string,
  provider: AiProvider = 'google-ai',
  audioUrl?: string
) => {
  stopSpeech();

  if (!text && !preGeneratedAudio && !audioUrl) return;

  // 0a. URL permanente do Storage — reprodução instantânea sem decodificação
  if (config.engine === 'gemini' && audioUrl) {
    try {
      isSpeakingState = true;
      await playAudioUrl(audioUrl, config.rate);
    } catch (e) {
      console.error('Error playing audio URL', e);
    } finally {
      isSpeakingState = false;
    }
    return;
  }

  // 0b. Base64 pré-gerado em memória (fallback quando URL não está disponível)
  if (config.engine === 'gemini' && preGeneratedAudio) {
      try {
          isSpeakingState = true;
          await playAudioData(preGeneratedAudio, config.rate);
      } catch (e) {
          console.error('Error playing pre-generated audio', e);
      } finally {
          isSpeakingState = false;
      }
      return;
  }

  // 1. Prefer Gemini TTS if API Key is available AND Engine is set to Gemini
  if (config.engine === 'gemini' && apiKey) {
      try {
          isSpeakingState = true;
          // Generate speech using Gemini
          const audioBase64 = await generateSpeech(apiKey, text, config, provider);
          
          if (audioBase64) {
             // Play the audio with the requested rate (speed)
             await playAudioData(audioBase64, config.rate);
          }
      } catch (error) {
          console.error("Gemini TTS Failed", error);
      } finally {
          isSpeakingState = false; 
      }
      return;
  }

  // 2. Fallback to Browser TTS (Legacy) — desativado por solicitação do usuário.
  return;
};

export const stopSpeech = () => {
  // Stop Gemini Audio
  stopCurrentAudio();
  isSpeakingState = false;

  // Stop Browser TTS
  if (synth) {
      synth.cancel();
  }
};

export const isSpeaking = () => {
  // Check both systems
  const browserSpeaking = synth ? synth.speaking : false;
  return browserSpeaking || isSpeakingState; 
};
