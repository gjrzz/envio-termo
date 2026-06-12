/**
 * Tipagens minimas para o SDK oficial `docusign-esign`, que nao publica
 * declaracoes TypeScript. Cobre apenas a superficie utilizada pelo
 * DocuSignService.
 */
declare module 'docusign-esign' {
  export interface JWTUserTokenResponse {
    body: {
      access_token: string;
      expires_in: number;
      token_type: string;
    };
  }

  export class ApiClient {
    setBasePath(basePath: string): void;
    setOAuthBasePath(basePath: string): void;
    addDefaultHeader(name: string, value: string): void;
    requestJWTUserToken(
      clientId: string,
      userId: string,
      scopes: string[],
      privateKey: Buffer,
      expiresIn: number,
    ): Promise<JWTUserTokenResponse>;
  }

  export class Document {
    documentBase64?: string;
    name?: string;
    fileExtension?: string;
    documentId?: string;
  }

  export class SignHere {
    anchorString?: string;
    anchorUnits?: string;
    anchorXOffset?: string;
    anchorYOffset?: string;
    static constructFromObject(obj: Record<string, unknown>): SignHere;
  }

  export class Tabs {
    signHereTabs?: SignHere[];
    static constructFromObject(obj: Record<string, unknown>): Tabs;
  }

  export class Signer {
    email?: string;
    name?: string;
    recipientId?: string;
    routingOrder?: string;
    tabs?: Tabs;
    static constructFromObject(obj: Record<string, unknown>): Signer;
  }

  export class Recipients {
    signers?: Signer[];
    static constructFromObject(obj: Record<string, unknown>): Recipients;
  }

  export class EnvelopeDefinition {
    emailSubject?: string;
    emailBlurb?: string;
    documents?: Document[];
    recipients?: Recipients;
    status?: string;
    static constructFromObject(obj: Record<string, unknown>): EnvelopeDefinition;
  }

  export interface EnvelopeSummary {
    envelopeId?: string;
    status?: string;
  }

  export interface Envelope {
    envelopeId?: string;
    status?: string;
    completedDateTime?: string;
  }

  export class EnvelopesApi {
    constructor(apiClient: ApiClient);
    createEnvelope(
      accountId: string,
      options: { envelopeDefinition: EnvelopeDefinition },
    ): Promise<EnvelopeSummary>;
    getEnvelope(accountId: string, envelopeId: string): Promise<Envelope>;
  }
}
