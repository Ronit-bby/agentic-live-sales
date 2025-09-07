import OpenAI from 'openai';

// OpenAI service configuration
class OpenAIService {
  private client: OpenAI | null = null;
  private isEnabled: boolean;

  constructor() {
    // Check if OpenAI API key is available
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    this.isEnabled = Boolean(apiKey);
    
    if (this.isEnabled && apiKey) {
      this.client = new OpenAI({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true // Only for demo - use backend in production
      });
      
      if (process.env.NODE_ENV === 'development') {
        console.log('OpenAI service initialized successfully');
      }
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log('OpenAI service disabled - using mock responses');
      }
    }
  }

  isReady(): boolean {
    return this.isEnabled && this.client !== null;
  }

  async transcribeAudio(audioBlob: Blob): Promise<string> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      const file = new File([audioBlob], 'audio.webm', { type: 'audio/webm' });
      
      const response = await this.client.audio.transcriptions.create({
        file: file,
        model: import.meta.env.VITE_OPENAI_WHISPER_MODEL || 'whisper-1',
        language: 'en',
        response_format: 'text'
      });

      return response || '';
    } catch (error) {
      console.error('Whisper transcription error:', error);
      throw new Error(`Transcription failed: ${error}`);
    }
  }

  async analyzeWithGPT4(
    prompt: string,
    systemPrompt: string,
    maxTokens: number = 1000
  ): Promise<string> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      const response = await this.client.chat.completions.create({
        model: import.meta.env.VITE_OPENAI_MODEL || 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: maxTokens,
        temperature: 0.3,
        response_format: { type: 'json_object' }
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('GPT-4 analysis error:', error);
      throw new Error(`Analysis failed: ${error}`);
    }
  }

  async streamAnalysis(
    prompt: string,
    systemPrompt: string,
    onChunk: (chunk: string) => void,
    maxTokens: number = 1000
  ): Promise<void> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      const stream = await this.client.chat.completions.create({
        model: import.meta.env.VITE_OPENAI_MODEL || 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: maxTokens,
        temperature: 0.3,
        stream: true
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          onChunk(content);
        }
      }
    } catch (error) {
      console.error('GPT-4 streaming error:', error);
      throw new Error(`Streaming analysis failed: ${error}`);
    }
  }
}

export const openAIService = new OpenAIService();