export interface ThreadsClientConfig {
  accessToken: string;
  userId: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

export interface CreateReplyContainerInput {
  text: string;
  replyToId: string;
}

export interface ThreadsPublishedReply {
  containerId: string;
  mediaId: string;
}

export interface ThreadsUserProfile {
  id: string;
  username?: string;
}

const DEFAULT_THREADS_BASE_URL = "https://graph.threads.net/v1.0";

export class ThreadsClient {
  private readonly accessToken: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly userId: string;

  constructor(config: ThreadsClientConfig) {
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl ?? DEFAULT_THREADS_BASE_URL;
    this.fetchImpl = config.fetchImpl ?? fetch;
    this.userId = config.userId;
  }

  private async request<TResponse>(
    path: string,
    init?: RequestInit,
  ): Promise<TResponse> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, init);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Threads API request failed (${response.status}): ${errorText}`,
      );
    }

    return (await response.json()) as TResponse;
  }

  async createReplyContainer({
    replyToId,
    text,
  }: CreateReplyContainerInput): Promise<{ id: string }> {
    const payload = new URLSearchParams({
      media_type: "TEXT",
      text,
      reply_to_id: replyToId,
      access_token: this.accessToken,
    });

    return this.request<{ id: string }>(`/${this.userId}/threads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: payload.toString(),
    });
  }

  async publishReplyContainer(creationId: string): Promise<{ id: string }> {
    const payload = new URLSearchParams({
      creation_id: creationId,
      access_token: this.accessToken,
    });

    return this.request<{ id: string }>(`/${this.userId}/threads_publish`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: payload.toString(),
    });
  }

  async publishReply(
    input: CreateReplyContainerInput,
  ): Promise<ThreadsPublishedReply> {
    const container = await this.createReplyContainer(input);
    const publishedReply = await this.publishReplyContainer(container.id);

    return {
      containerId: container.id,
      mediaId: publishedReply.id,
    };
  }

  async getCurrentUserProfile(): Promise<ThreadsUserProfile> {
    const params = new URLSearchParams({
      fields: "id,username",
      access_token: this.accessToken,
    });

    return this.request<ThreadsUserProfile>(`/me?${params.toString()}`);
  }

  async getReplyPublishingLimit(): Promise<{
    quota_usage: number;
    quota_total: number;
  }> {
    const params = new URLSearchParams({
      fields: "reply_quota_usage,reply_config",
      access_token: this.accessToken,
    });

    try {
      const data = await this.request<{
        reply_quota_usage?: number;
        reply_config?: { quota_total: number; quota_duration: number };
      }>(`/${this.userId}/threads_publishing_limit?${params}`);

      return {
        quota_usage: data.reply_quota_usage ?? 0,
        quota_total: data.reply_config?.quota_total ?? 1000,
      };
    } catch {
      return { quota_usage: 0, quota_total: 1000 };
    }
  }
}
