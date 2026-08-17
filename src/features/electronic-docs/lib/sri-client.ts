import type { SriMessage } from "../types";

const ENDPOINTS = {
  pruebas: {
    recepcion:
      "https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline",
    autorizacion:
      "https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline",
  },
  produccion: {
    recepcion:
      "https://cel.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline",
    autorizacion:
      "https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline",
  },
} as const;

export type SriDocumentStatus = "authorized" | "received" | "rejected";

export type SriAuthResult = {
  status: SriDocumentStatus;
  authorizationNumber: string | null;
  authorizationDate: Date | null;
  messages: SriMessage[];
};

function soapEnvelope(body: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>${body}</soap:Body>
</soap:Envelope>`;
}

function extractTag(xml: string, tag: string) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const match = xml.match(re);
  return match?.[1]?.trim() ?? null;
}

function extractMessages(xml: string): SriMessage[] {
  const messages: SriMessage[] = [];
  const re = /<mensaje>([\s\S]*?)<\/mensaje>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml)) !== null) {
    const block = match[1];
    messages.push({
      type: extractTag(block, "tipo") ?? undefined,
      message: extractTag(block, "mensaje") ?? undefined,
      identifier: extractTag(block, "identificador") ?? undefined,
    });
  }
  return messages;
}

function messageBlob(messages: SriMessage[]) {
  return messages
    .map((msg) => `${msg.type ?? ""} ${msg.message ?? ""} ${msg.identifier ?? ""}`)
    .join(" ")
    .toUpperCase();
}

export function resolveAuthorizationResponse(input: {
  authState: string | null;
  authNumber: string | null;
  authDateRaw: string | null;
  messages: SriMessage[];
  fallbackText?: string;
}): SriAuthResult {
  const state = (input.authState ?? "").trim().toUpperCase();
  const blob = messageBlob(input.messages);

  if (state === "AUTORIZADO" && input.authNumber) {
    return {
      status: "authorized",
      authorizationNumber: input.authNumber,
      authorizationDate: input.authDateRaw ? new Date(input.authDateRaw) : new Date(),
      messages: input.messages,
    };
  }

  const explicitRejection =
    state === "NO AUTORIZADO" ||
    state === "RECHAZADO" ||
    state === "DEVUELTA" ||
    blob.includes("NO AUTORIZADO") ||
    blob.includes("RECHAZADO") ||
    blob.includes("DEVUELTA");

  if (explicitRejection) {
    return {
      status: "rejected",
      authorizationNumber: null,
      authorizationDate: null,
      messages: input.messages.length
        ? input.messages
        : [{ message: input.fallbackText?.slice(0, 500) ?? "Rechazado por el SRI" }],
    };
  }

  const inProcessing =
    !state ||
    state === "EN PROCESO" ||
    state === "PPR" ||
    blob.includes("EN PROCESO") ||
    blob.includes("PPR") ||
    blob.includes("PROCESAMIENTO");

  if (inProcessing) {
    return {
      status: "received",
      authorizationNumber: null,
      authorizationDate: null,
      messages: input.messages.length
        ? input.messages
        : [{ message: "Comprobante recibido, autorización en procesamiento" }],
    };
  }

  return {
    status: "rejected",
    authorizationNumber: null,
    authorizationDate: null,
    messages: input.messages.length
      ? input.messages
      : [{ message: input.fallbackText?.slice(0, 500) ?? "Respuesta desconocida del SRI" }],
  };
}

export async function queryInvoiceAuthorization(input: {
  accessKey: string;
  environment: "pruebas" | "produccion";
}) {
  const endpoints = ENDPOINTS[input.environment];
  const authBody = `<autorizacionComprobante xmlns="http://ec.gob.sri.ws.autorizacion">
  <claveAccesoComprobante>${input.accessKey}</claveAccesoComprobante>
</autorizacionComprobante>`;

  const authRes = await fetch(endpoints.autorizacion, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: "",
    },
    body: soapEnvelope(authBody),
  });

  const authText = await authRes.text();
  return resolveAuthorizationResponse({
    authState: extractTag(authText, "estado"),
    authNumber: extractTag(authText, "numeroAutorizacion"),
    authDateRaw: extractTag(authText, "fechaAutorizacion"),
    messages: extractMessages(authText),
    fallbackText: authText,
  });
}

export async function sendInvoiceToSri(input: {
  signedXml: string;
  accessKey: string;
  environment: "pruebas" | "produccion";
}) {
  const endpoints = ENDPOINTS[input.environment];
  const xmlBase64 = Buffer.from(input.signedXml, "utf8").toString("base64");

  const recepcionBody = `<validarComprobante xmlns="http://ec.gob.sri.ws.recepcion">
  <xml>${xmlBase64}</xml>
</validarComprobante>`;

  const recepcionRes = await fetch(endpoints.recepcion, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: "",
    },
    body: soapEnvelope(recepcionBody),
  });

  const recepcionText = await recepcionRes.text();
  const recepcionState =
    extractTag(recepcionText, "estado") ?? (recepcionRes.ok ? "RECIBIDA" : "ERROR");
  const recepcionMessages = extractMessages(recepcionText);

  if (recepcionState !== "RECIBIDA") {
    return {
      status: "rejected" as const,
      authorizationNumber: null,
      authorizationDate: null,
      messages: recepcionMessages.length
        ? recepcionMessages
        : [{ message: recepcionText.slice(0, 500) }],
    };
  }

  await new Promise((resolve) => setTimeout(resolve, 1200));

  return queryInvoiceAuthorization({
    accessKey: input.accessKey,
    environment: input.environment,
  });
}
