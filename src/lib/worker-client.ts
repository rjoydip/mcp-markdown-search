export interface WorkerClientConfig {
  workerUrl: string;
  workerSecret: string;
}

export interface SemanticSearchResult {
  id: string;
  score: number;
  metadata: {
    filePath: string;
    chunkIndex: number;
    totalChunks: number;
    preview: string;
  };
}

export interface SearchResponse {
  results: SemanticSearchResult[];
  query: string;
}

export interface IndexResponse {
  indexed: boolean;
  filePath: string;
  chunks: number;
  vectors: number;
}

export class WorkerClient {
  constructor(private config: WorkerClientConfig) {}

  async search(
    query: string,
    topK: number = 5,
    scoreThreshold: number = 0.5,
  ): Promise<SearchResponse> {
    return this.post<SearchResponse>("/search", { query, topK, scoreThreshold });
  }

  async index(filePath: string, content: string): Promise<IndexResponse> {
    return this.post<IndexResponse>("/index", { filePath, content });
  }

  async health(): Promise<{ status: string; version: string }> {
    const res = await fetch(`${this.config.workerUrl}/health`);
    if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
    return res.json() as Promise<{ status: string; version: string }>;
  }

  private async post<T>(route: string, body: unknown): Promise<T> {
    const { workerUrl, workerSecret } = this.config;

    if (!workerUrl) throw new Error("WORKER_URL env var is not set.");
    if (!workerSecret) throw new Error("WORKER_SECRET env var is not set.");

    const res = await fetch(`${workerUrl}${route}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-MCP-Secret": workerSecret,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Worker ${route} failed (${res.status}): ${text}`);
    }

    return res.json() as Promise<T>;
  }
}
