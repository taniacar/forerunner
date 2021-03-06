﻿using System;
using System.Xml;
using System.IO;
using System.IO.Compression;

namespace ForeRunner.Reporting.Extensions.SAMLUtils
{
    public class SAMLRequestHelper
    {
        private TenantInfo tenantInfo;
        private string id;
        private string issueInstant;
        private Uri assertionConsumerServiceUri;
        private string issuer;

        private bool isGZip = false;
        private bool isPost = false;

        public SAMLRequestHelper(TenantInfo tenantInfo, Uri assertionConsumerServiceUri, String issuer)
        {
            this.tenantInfo = tenantInfo;
            id = "_" + System.Guid.NewGuid().ToString().Replace("-", "");
            issueInstant = DateTime.Now.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ");
            DateTime time = DateTime.Parse(issueInstant);
            this.assertionConsumerServiceUri = assertionConsumerServiceUri;
            this.issuer = issuer;
        }

        public bool IsGZip
        {
            set
            {
                isGZip = value;
            }
            get
            {
                return isGZip;
            }
        }

        public bool IsPostBinding
        {
            set
            {
                isPost = value;
            }
            get
            {
                return isPost;
            }
        }

        public string generateSAMLRequest()
        {
            using (StringWriter stringWriter = new StringWriter())
            {
                XmlWriterSettings xmlWriterSettings = new XmlWriterSettings();
                xmlWriterSettings.OmitXmlDeclaration = true;

                using (XmlWriter xmlWriter = XmlWriter.Create(stringWriter, xmlWriterSettings))
                {
                    xmlWriter.WriteStartElement("samlp", "AuthnRequest", "urn:oasis:names:tc:SAML:2.0:protocol");
                    xmlWriter.WriteAttributeString("ID", id);
                    xmlWriter.WriteAttributeString("Version", "2.0");
                    xmlWriter.WriteAttributeString("IssueInstant", issueInstant);
                    xmlWriter.WriteAttributeString("ProtocolBinding", isPost ? "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" : "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect");
                    xmlWriter.WriteAttributeString("Destination", tenantInfo.IDP.OriginalString);
                    xmlWriter.WriteAttributeString("ProviderName", "ForeRunner");
                    xmlWriter.WriteAttributeString("AssertionConsumerServiceURL", assertionConsumerServiceUri.ToString());

                    xmlWriter.WriteStartElement("saml", "Issuer", "urn:oasis:names:tc:SAML:2.0:assertion");
                    xmlWriter.WriteString(issuer);
                    xmlWriter.WriteEndElement();

                    xmlWriter.WriteStartElement("samlp", "NameIDPolicy", "urn:oasis:names:tc:SAML:2.0:protocol");
                    xmlWriter.WriteAttributeString("Format", "urn:oasis:names:tc:SAML:2.0:nameid-format:persistent");
                    xmlWriter.WriteAttributeString("AllowCreate", "true");
                    xmlWriter.WriteEndElement();

                    //xmlWriter.WriteStartElement("samlp", "RequestedAuthnContext", "urn:oasis:names:tc:SAML:2.0:protocol");
                    //xmlWriter.WriteAttributeString("Comparison", "exact");
                    //xmlWriter.WriteEndElement();

                    //xmlWriter.WriteStartElement("saml", "AuthnContextClassRef", "urn:oasis:names:tc:SAML:2.0:assertion");
                    //xmlWriter.WriteString("urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport");
                    //xmlWriter.WriteEndElement();

                    xmlWriter.WriteEndElement();
                }
                byte[] toEncodeAsBytes = System.Text.Encoding.UTF8.GetBytes(stringWriter.ToString());
                   
                if (isGZip)
                {
                    return zipAndEncode(toEncodeAsBytes);
                }
                else
                {
                     return System.Convert.ToBase64String(toEncodeAsBytes);
                }
            }
        }

        public static string zipAndEncode(byte[] toEncodeAsBytes) 
        {
            using (MemoryStream output = new MemoryStream())
            {
                using (var zip = new GZipStream(output, CompressionMode.Compress))
                {
                    zip.Write(toEncodeAsBytes, 0, toEncodeAsBytes.Length);
                }
                return Convert.ToBase64String(output.ToArray());
            }
        }
    }
}