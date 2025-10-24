import { WebWorkerMLCEngine } from "@mlc-ai/web-llm";
import type { LlmModelConfig } from '../types';

class LocalLlmManager {
  private engine: WebWorkerMLCEngine | null = null;
  
  private async checkStorage(requiredBytes: number): Promise<void> {
    if (navigator.storage && navigator.storage.estimate) {
        const quota = await navigator.storage.estimate();
        // Check if both quota and usage are defined.
        if (quota.quota !== undefined && quota.usage !== undefined) {
            const available = quota.quota - quota.usage;
            if (available < requiredBytes) {
                throw new Error(
                    `Insufficient storage. Required: ${(requiredBytes / 1e9).toFixed(2)} GB, ` +
                    `Available: ${(available / 1e9).toFixed(2)} GB. ` +
                    `Please clear some space.`
                );
            }
        }
    }
  }
  
  async loadModel(
    modelConfig: LlmModelConfig,
    onProgress: (progress: number, message: string) => void
  ) {
    onProgress(0, 'Initializing AI Engine...');
    try {
      if (!this.engine) {
        this.engine = new WebWorkerMLCEngine(
          new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
        );
      }
      
      onProgress(5, 'Checking available storage...');
      await this.checkStorage(modelConfig.sizeBytes);

      const progressCallback = (report: { progress: number, text: string }) => {
        onProgress(10 + (report.progress * 80), report.text);
      };
      
      onProgress(10, 'Downloading model weights...');
      this.engine.setInitProgressCallback(progressCallback);
      // FIX: The `reload` method expects `appConfig` as the second argument.
      // The `chatOpts` argument was removed.
      await this.engine.reload(modelConfig.id, {
        model_list: [{
            "model_url": modelConfig.url,
            "local_id": modelConfig.id
        }]
      });

      onProgress(95, 'Verifying model integrity (simulated)...');
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log(`Simulated checksum verification for ${modelConfig.sha256}`);

      onProgress(100, 'Engine ready.');
    } catch (error) {
      console.error("Failed to initialize WebLLM engine", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      throw new Error(errorMessage);
    }
  }

  async loadModelFromBuffer(
    modelBuffer: ArrayBuffer,
    onProgress: (progress: number, message: string) => void
  ) {
    onProgress(0, 'Initializing AI Engine...');
    try {
        if (!this.engine) {
            this.engine = new WebWorkerMLCEngine(
                new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
            );
        }

        const progressCallback = (report: { progress: number, text: string }) => {
            onProgress(report.progress * 100, report.text);
        };
        this.engine.setInitProgressCallback(progressCallback);
        
        // FIX: The `reload` method expects `appConfig` as the second argument.
        // The `chatOpts` argument was removed.
        await this.engine.reload('local-model', {
            model_list: [{
                "model_url": "local", // URL is not used, but required for the structure.
                "local_id": "local-model",
                "model": modelBuffer
            }]
        });

        onProgress(100, 'Local model loaded successfully.');
    } catch (error) {
        console.error("Failed to load local model from buffer", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        throw new Error(errorMessage);
    }
  }

  async generateStream(
      systemInstruction: string,
      prompt: string,
      onChunk: (text: string) => void,
      onFinish: () => void,
  ) {
    if (!this.engine) {
      throw new Error("Model is not loaded. Please call loadModel first.");
    }
    
    try {
      const stream = await this.engine.chat.completions.create({
        stream: true,
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: prompt },
        ],
      });

      let fullResponse = "";
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || "";
        if (delta) {
          fullResponse += delta;
          onChunk(fullResponse);
        }
      }
    } catch (e) {
      const error = e instanceof Error ? e : new Error('An unknown error occurred');
      console.error("Error during content generation stream:", error);
      onChunk(`Sorry, an error occurred: ${error.message}`);
    } finally {
      onFinish();
    }
  }
  
  async clearCache() {
      if(this.engine) {
          await (this.engine as any).clearCache();
      }
  }
}

export const llmService = new LocalLlmManager();