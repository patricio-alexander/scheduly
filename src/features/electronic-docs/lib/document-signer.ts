import { readFile } from "node:fs/promises";
import path from "node:path";
import forge from "node-forge";
import { decryptSecret } from "@/shared/utils/secret-crypto";

export async function signInvoiceXml(input: {
  xml: string;
  certStoragePath: string;
  certPasswordEnc: string;
}): Promise<string> {
  const absolute = path.isAbsolute(input.certStoragePath)
    ? input.certStoragePath
    : path.join(process.cwd(), input.certStoragePath);
  const p12Buffer = await readFile(absolute);
  const password = decryptSecret(input.certPasswordEnc);
  const p12Asn1 = forge.asn1.fromDer(p12Buffer.toString("binary"));
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
  const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
  const certBag = certBags[forge.pki.oids.certBag]?.[0];
  const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];
  if (!certBag?.cert || !keyBag?.key) {
    throw new Error("No se pudo leer certificado o clave privada del .p12");
  }

  const certificate = certBag.cert;
  const privateKey = keyBag.key;
  const certDer = forge.asn1.toDer(forge.pki.certificateToAsn1(certificate)).getBytes();
  const certBase64 = forge.util.encode64(certDer);
  const certDigest = forge.md.sha1.create();
  certDigest.update(certDer, "raw");
  const certDigestBase64 = forge.util.encode64(certDigest.digest().getBytes());

  const xmlDigest = forge.md.sha1.create();
  xmlDigest.update(input.xml, "utf8");
  const xmlDigestBase64 = forge.util.encode64(xmlDigest.digest().getBytes());

  const signedInfo = `<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#">
  <CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
  <SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>
  <Reference URI="#comprobante">
    <Transforms>
      <Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
    </Transforms>
    <DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>
    <DigestValue>${xmlDigestBase64}</DigestValue>
  </Reference>
</SignedInfo>`;

  const signedInfoDigest = forge.md.sha1.create();
  signedInfoDigest.update(signedInfo, "utf8");
  const signature = privateKey.sign(signedInfoDigest);
  const signatureBase64 = forge.util.encode64(signature);

  const xades = `<ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Id="Signature">
${signedInfo}
<ds:SignatureValue>${signatureBase64}</ds:SignatureValue>
<ds:KeyInfo>
  <ds:X509Data>
    <ds:X509Certificate>${certBase64}</ds:X509Certificate>
  </ds:X509Data>
</ds:KeyInfo>
<ds:Object Id="SignatureObject">
  <xades:QualifyingProperties xmlns:xades="http://uri.etsi.org/01903/v1.3.2#" Target="#Signature">
    <xades:SignedProperties Id="SignedProperties">
      <xades:SignedSignatureProperties>
        <xades:SigningTime>${new Date().toISOString()}</xades:SigningTime>
        <xades:SigningCertificate>
          <xades:Cert>
            <xades:CertDigest>
              <ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>
              <ds:DigestValue>${certDigestBase64}</ds:DigestValue>
            </xades:CertDigest>
          </xades:Cert>
        </xades:SigningCertificate>
      </xades:SignedSignatureProperties>
    </xades:SignedProperties>
  </xades:QualifyingProperties>
</ds:Object>
</ds:Signature>`;

  return input.xml.replace("</factura>", `${xades}\n</factura>`);
}
