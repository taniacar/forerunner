﻿using System;
using System.Configuration;
using System.Globalization;
using System.Management;
using System.Text;
using System.Web;
using ForeRunner.Reporting.Extensions.SAMLUtils;

namespace ForeRunner.Reporting.Extensions.SAML
{
    public class AssertionConsumerService : IHttpHandler
    {
        private const int MaxItemPathLength = 260;
        private string wmiNamespace = @"\root\Microsoft\SqlServer\ReportServer\{0}\v10";
        private string rsAsmx = @"/ReportService2010.asmx";
        /// <summary>
        /// You will need to configure this handler in the web.config file of your 
        /// web and register it with IIS before being able to use it. For more information
        /// see the following link: http://go.microsoft.com/?linkid=8101007
        /// </summary>
        #region IHttpHandler Members

        public AssertionConsumerService()
        {
            string RSServerVersion = ConfigurationManager.AppSettings["ForeRunnerRSServerVersion"];
            // 2005 and 2008 both uses the 2005.asmx.
            // TODO:  Need to check the WMI Namespace for 2008R2 and 2012.
            if (RSServerVersion.Equals("v9"))
            {
                wmiNamespace = @"\root\Microsoft\SqlServer\ReportServer\{0}\v9";
                rsAsmx = @"/ReportService2005.asmx";
            }
            else if (RSServerVersion.Equals("v10"))
            {
                wmiNamespace = @"\root\Microsoft\SqlServer\ReportServer\{0}\v10";
                rsAsmx = @"/ReportService2005.asmx";
            }
            else if (!RSServerVersion.Equals("v10.5") && !RSServerVersion.Equals("v11"))
            {
                throw new Exception("Unsupported RS Version");
            }
        }

        public bool IsReusable
        {
            // Return false in case your Managed Handler cannot be reused for another request.
            // Usually this would be false in case you have some state information preserved per request.
            get { return true; }
        }

        public void ProcessRequest(HttpContext context)
        {
            if (context.Request.ContentLength < 65536)
            {
                string rawSamlData = HttpUtility.UrlDecode(context.Request["SAMLResponse"]);
                // TODO:  This should have been encrypted!  So we needed to decrypt it.
                // It is critical that we do so because we use the Url to determine the authority.
                string redirectUrl = Encoding.UTF8.GetString(Convert.FromBase64String(HttpUtility.UrlDecode(context.Request["RelayState"])));
                string authority = SAMLHelperBase.GetAuthorityFromUrl(redirectUrl);
                if (authority == null)
                {
                    authority = "";
                }

                // read the base64 encoded bytes
                byte[] samlData = Convert.FromBase64String(rawSamlData);
                // We need to decide if this is a compressed stream that needs to be inflated.
                samlData = SAMLHelperBase.inflateIfNeeded(samlData);
                // read back into a UTF string
                string SAMLResponse = Encoding.UTF8.GetString(samlData);
                string nameID;
                string issuer;

                SAMLResponseHelper helper = new SAMLResponseHelper(null, SAMLResponse, null, null);
                helper.GetNameIDAndIssuerFromResponse(out nameID, out issuer);
                if (nameID == null || issuer == null)
                {
                    throw new ArgumentException("The subject name identifier or the issuer cannot be null.");
                }

                string userName = SAMLHelperBase.GetUserName(authority, nameID);
                
                ReportServerProxy server = new ReportServerProxy();

                string reportServer = ConfigurationManager.AppSettings["ReportServer"];
                string instanceName = ConfigurationManager.AppSettings["ReportServerInstance"];

                // Get the server URL from the report server using WMI
                server.Url = GetReportServerUrl(reportServer, instanceName);

                server.LogonUser(userName, SAMLResponse, authority);
                if (redirectUrl != null)
                {
                    HttpContext.Current.Response.Redirect(redirectUrl, false);
                }
                else
                {
                    // TODO:
                    // Where should this go to?
                }
            }
            else
            {
                throw new ArgumentException("Invalid SAML Response");
            }
        }

        //Method to get the report server url using WMI
        [System.Diagnostics.CodeAnalysis.SuppressMessage("Microsoft.Usage", "CA2201:DoNotRaiseReservedExceptionTypes"), System.Diagnostics.CodeAnalysis.SuppressMessage("Microsoft.Usage", "CA2201:DoNotRaiseReservedExceptionTypes")]
        private string GetReportServerUrl(string machineName, string instanceName)
        {
            string reportServerVirtualDirectory = String.Empty;
            string fullWmiNamespace = @"\\" + machineName + string.Format(wmiNamespace, instanceName);

            ManagementScope scope = null;

            ConnectionOptions connOptions = new ConnectionOptions();
            connOptions.Authentication = AuthenticationLevel.PacketPrivacy;

            //Get management scope
            try
            {
                scope = new ManagementScope(fullWmiNamespace, connOptions);
                scope.Connect();

                //Get management class
                ManagementPath path = new ManagementPath("MSReportServer_Instance");
                ObjectGetOptions options = new ObjectGetOptions();
                ManagementClass serverClass = new ManagementClass(scope, path, options);

                serverClass.Get();

                if (serverClass == null)
                    throw new Exception(string.Format(CultureInfo.InvariantCulture,
                      CustomSecurity.WMIClassError));

                //Get instances
                ManagementObjectCollection instances = serverClass.GetInstances();

                foreach (ManagementObject instance in instances)
                {
                    instance.Get();

                    ManagementBaseObject outParams = (ManagementBaseObject)instance.InvokeMethod("GetReportServerUrls",
                       null, null);

                    string[] appNames = (string[])outParams["ApplicationName"];
                    string[] urls = (string[])outParams["URLs"];

                    for (int i = 0; i < appNames.Length; i++)
                    {
                        if (appNames[i] == "ReportServerWebService")
                            reportServerVirtualDirectory = urls[i];
                    }

                    if (reportServerVirtualDirectory == string.Empty)
                        throw new Exception(string.Format(CultureInfo.InvariantCulture,
                           CustomSecurity.MissingUrlReservation));
                }
            }
            catch (Exception ex)
            {
                throw new Exception(string.Format(CultureInfo.InvariantCulture,
                    CustomSecurity.RSUrlError + ex.Message), ex);
            }

            return reportServerVirtualDirectory + rsAsmx;
        }
        #endregion
    }
}
