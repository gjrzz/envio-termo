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

  export interface UserInfo {
    accounts: Array<{
      accountId: string;
      accountName: string;
      baseUri: string;
      isDefault: string;
    }>;
  }

  export interface UserInfoResponse {
    accounts: Array<{
      accountId: string;
      accountName: string;
      baseUri: string;
      isDefault: string;
    }>;
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
    getUserInfo(accessToken: string): Promise<UserInfoResponse>;
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
    templateId?: string;
    templateRoles?: Array<{
      email?: string;
      name?: string;
      roleName?: string;
      tabs?: {
        textTabs?: Array<{ tabLabel?: string; value?: string }>;
        signHereTabs?: SignHere[];
      };
    }>;
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

  export interface EnvelopeTemplate {
    templateId?: string;
    name?: string;
    description?: string;
    shared?: string;
    created?: string;
    lastModified?: string;
  }

  export interface EnvelopeTemplateResults {
    envelopeTemplates?: EnvelopeTemplate[];
    resultSetSize?: string;
    totalSetSize?: string;
  }

  export interface TemplateRecipient {
    recipientId?: string;
    roleName?: string;
    routingOrder?: string;
    name?: string;
    email?: string;
  }

  export interface TemplateRecipients {
    signers?: TemplateRecipient[];
    carbonCopies?: TemplateRecipient[];
    certifiedDeliveries?: TemplateRecipient[];
  }

  export interface TemplateTab {
    tabLabel?: string;
    tabType?: string;
    required?: string;
    recipientId?: string;
    name?: string;
    value?: string;
    documentId?: string;
    pageNumber?: string;
    xPosition?: string;
    yPosition?: string;
    anchorString?: string;
  }

  export interface TemplateTabs {
    textTabs?: TemplateTab[];
    signHereTabs?: TemplateTab[];
    dateSignedTabs?: TemplateTab[];
    checkboxTabs?: TemplateTab[];
    listTabs?: TemplateTab[];
    numberTabs?: TemplateTab[];
    fullNameTabs?: TemplateTab[];
    emailTabs?: TemplateTab[];
    initialHereTabs?: TemplateTab[];
    dateTabs?: TemplateTab[];
    [key: string]: TemplateTab[] | undefined;
  }

  export interface TemplateDetails {
    templateId?: string;
    name?: string;
    description?: string;
    recipients?: TemplateRecipients;
  }

  export class TemplatesApi {
    constructor(apiClient: ApiClient);
    listTemplates(
      accountId: string,
      options?: Record<string, unknown>,
    ): Promise<EnvelopeTemplateResults>;
    get(
      accountId: string,
      templateId: string,
      options?: Record<string, unknown>,
    ): Promise<TemplateDetails>;
    listRecipients(
      accountId: string,
      templateId: string,
      options?: Record<string, unknown>,
    ): Promise<TemplateRecipients>;
    listTabs(
      accountId: string,
      templateId: string,
      recipientId: string,
      options?: Record<string, unknown>,
    ): Promise<TemplateTabs>;
  }
}
