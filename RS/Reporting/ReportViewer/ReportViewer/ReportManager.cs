﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Net;
using System.Web;
using System.Data.SqlClient;
using Forerunner;
using Forerunner.SSRS.Viewer;
using Forerunner.SSRS.Management;
using Forerunner.Security;
using ReportManager.Util.Logging;
using Jayrock.Json;
using System.Threading;
using System.Web.Security;
using System.Security.Principal;
using Forerunner.SSRS;

namespace Forerunner.SSRS.Manager
{
    /// <summary>
    /// This is the proxy class that would call RS to get the data
    /// </summary>
    public class ReportManager : IDisposable
    {
        RSManagementProxy rs;
        Credentials WSCredentials;
        Credentials DBCredentials;
        Impersonator impersonator;
        bool useIntegratedSecurity;
        bool IsNativeRS = true;
        string URL;
        bool isSchemaChecked = false;
        string DefaultUserDomain = null;
        string SharePointHostName = null;
        SqlConnection SQLConn;

        public ReportManager(string URL, Credentials WSCredentials, string ReportServerDataSource, string ReportServerDB, Credentials DBCredentials, bool useIntegratedSecurity, bool IsNativeRS, string DefaultUserDomain, string SharePointHostName = null)
        {
            rs = new RSManagementProxy(IsNativeRS);
            this.DefaultUserDomain = DefaultUserDomain;
            this.SharePointHostName = SharePointHostName;
            this.IsNativeRS = IsNativeRS;
            this.WSCredentials = WSCredentials;
            this.DBCredentials = DBCredentials;
            this.useIntegratedSecurity = useIntegratedSecurity;
            rs.Url = URL;
            this.URL = URL;
            

            rs.Credentials = WSCredentials == null ? null : new NetworkCredential(WSCredentials.UserName, WSCredentials.Password, WSCredentials.Domain);
            SqlConnectionStringBuilder builder = new SqlConnectionStringBuilder();
            builder.DataSource = ReportServerDataSource;
            builder.InitialCatalog = ReportServerDB;
            if (useIntegratedSecurity)
            {
                builder.IntegratedSecurity = true;
            }
            else
            {
                builder.UserID = DBCredentials.UserName;
                String Password = DBCredentials.encrypted ? Security.Encryption.Decrypt(DBCredentials.Password) : DBCredentials.Password;
                builder.Password = Password;
            }

            //builder.MaxPoolSize = 24;

            SQLConn = new SqlConnection(builder.ConnectionString);
            CheckSchema();
        }

        public void SetCredentials(Credentials Credentials)
        {
            if (Credentials != null)
            {
                rs.Credentials = new NetworkCredential(Credentials.UserName, Credentials.Password, Credentials.Domain);
            }
        }

        public string UpdateView(string view, string action, string path)
        {

            if (view == "favorites")
            {
                if (action == "delete")
                    return this.DeleteFavorite(path);
                else if (action == "add")
                    return this.SaveFavorite(path);
            }

            return null;
        }

        public IEnumerable<CatalogItem> GetItems(string view, string path)
        {
            if (view == "favorites")
                return this.GetFavorites();
            else if (view == "recent")
                return this.GetRecentReports();
            else if (view == "catalog")
                return this.ListChildren(HttpUtility.UrlDecode(path), false);
            else
                return null;
        }

        private ICredentials credentials = null;
        private void SetCredentials(ICredentials credentials)
        {
            this.credentials = credentials;
        }

        private ICredentials GetCredentials()
        {
            if (credentials != null)
                return credentials;

            if (AuthenticationMode.GetAuthenticationMode() == System.Web.Configuration.AuthenticationMode.Windows)
            {
                return CredentialCache.DefaultNetworkCredentials;
            }

            HttpCookie authCookie = HttpContext.Current.Request.Cookies[FormsAuthentication.FormsCookieName];
            FormsAuthenticationTicket authTicket = FormsAuthentication.Decrypt(authCookie.Value);
            
            return new NetworkCredential(authTicket.Name, authTicket.UserData);
        }

        private CatalogItem[] callListChildren(string path, Boolean isRecursive)
        {
            rs.Credentials = GetCredentials();
            return rs.ListChildren(HttpUtility.UrlDecode(path),isRecursive);
        }

        private void OpenSQLConn()
        {
            if (SQLConn.State != System.Data.ConnectionState.Open)
            {
                SQLConn.Open();
            }
        }

        private void CloseSQLConn()
        {
            if (SQLConn.State == System.Data.ConnectionState.Open)
            {
                SQLConn.Close();
            }
        }

        private Property[] callGetProperties(string path, Property[] props)
        {
            // Please review this call stack.
            // This call is already in the impersonated context
            // No need to impersonate again.
            rs.Credentials = GetCredentials();

            return rs.GetProperties(path, props);
        }

        private string[] callGetPermissions(string path)
        {
            rs.Credentials = GetCredentials();
            return rs.GetPermissions(path);
        }

        public CatalogItem[] ListChildren(string path, Boolean isRecursive)
        {
            Logger.Trace(LogType.Info, "ListChildren:  Path=" + path);
            List<CatalogItem> list = new List<CatalogItem>();
            CatalogItem[] items = callListChildren(path, isRecursive);
            foreach (CatalogItem ci in items)
            {
                if (ci.Type == ItemTypeEnum.Report )
                {
                    if (!ci.Hidden)
                        list.Add(ci);
                }
                if ((ci.Type == ItemTypeEnum.Folder || ci.Type == ItemTypeEnum.Site) && !ci.Hidden)
                {
                    CatalogItem[] folder = callListChildren(ci.Path, false);
                    foreach (CatalogItem fci in folder)
                    {
                        if (fci.Type == ItemTypeEnum.Report || fci.Type == ItemTypeEnum.Folder || fci.Type == ItemTypeEnum.Site)
                        {
                            if (!ci.Hidden)
                            {
                                list.Add(ci);
                                break;
                            }
                        }
                    }
                }
            }
            return list.ToArray();
        }

        private Impersonator tryImpersonate(bool doNotCallImpersonate = false) 
        {
            if (!useIntegratedSecurity) return null;
            if (impersonator == null)
            {
                String Password = DBCredentials.encrypted ? Security.Encryption.Decrypt(DBCredentials.Password) : DBCredentials.Password;
                impersonator = new Impersonator(DBCredentials.UserName, DBCredentials.Domain, Password);
            }
            if (!doNotCallImpersonate)
                impersonator.Impersonate();
            return impersonator;
        }

        void CheckSchema()
        {
            if (isSchemaChecked)
                return;
            Impersonator impersonator = null;
            try
            {
                impersonator = tryImpersonate();
                //This should move to the install program
                string SQL = @"
                           IF NOT EXISTS(SELECT * FROM sysobjects WHERE type = 'u' AND name = 'ForerunnerDBVersion')
                            BEGIN	                            
	                            CREATE TABLE ForerunnerDBVersion (Version varchar(200) NOT NULL,PreviousVersion varchar(200) NOT NULL, PRIMARY KEY (Version))  
                                INSERT ForerunnerDBVersion (Version,PreviousVersion) SELECT '1.1','0'
                            END
                            ELSE
                                UPDATE ForerunnerDBVersion SET PreviousVersion = Version,Version = '1.1'  FROM ForerunnerDBVersion

                            DECLARE @DBVersion varchar(200) 
                            DECLARE @DBVersionPrev varchar(200) 
                            SELECT @DBVersion = Version, @DBVersionPrev =PreviousVersion  FROM ForerunnerDBVersion                        

                           IF NOT EXISTS(SELECT * FROM sysobjects WHERE type = 'u' AND name = 'ForerunnerCatalog')
                            BEGIN	                            
	                            CREATE TABLE ForerunnerCatalog (ItemID uniqueidentifier NOT NULL,UserID uniqueidentifier NULL ,ThumbnailImage image NOT NULL, SaveDate datetime NOT NULL,CONSTRAINT uc_PK UNIQUE (ItemID,UserID))  
                            END
                           IF NOT EXISTS(SELECT * FROM sysobjects WHERE type = 'u' AND name = 'ForerunnerFavorites')
                            BEGIN	                            	                            
                                CREATE TABLE ForerunnerFavorites(ItemID uniqueidentifier NOT NULL,UserID uniqueidentifier NOT NULL,PRIMARY KEY (ItemID,UserID))
                            END
                            IF NOT EXISTS(SELECT * FROM sysobjects WHERE type = 'u' AND name = 'ForerunnerUserItemProperties')
                            BEGIN	                            	                            
                                CREATE TABLE ForerunnerUserItemProperties(ItemID uniqueidentifier NOT NULL,UserID uniqueidentifier NULL, SavedParameters varchar(max), CONSTRAINT uip_PK UNIQUE (ItemID,UserID))
                            END
                            IF NOT EXISTS(SELECT * FROM sysobjects WHERE type = 'u' AND name = 'ForerunnerUserSettings')
                            BEGIN	                            	                            
                                CREATE TABLE ForerunnerUserSettings(UserID uniqueidentifier NOT NULL, Settings varchar(max), PRIMARY KEY (UserID))
                            END

                          /*  Version update Code */
                           /*
                           IF @DBVersionPrev = 1.1 
                             BEGIN
                              ALTER TABLE ForerunnerCatalog ...
                              ALTER TABLE ForerunnerUserItemProperties ...
                              SELECT @DBVersionPrev = '1.2'
                             END

                           IF @DBVersionPrev = 1.2 
                             BEGIN
                              ALTER TABLE ForerunnerCatalog ...
                              ALTER TABLE ForerunnerUserItemProperties ...
                              SELECT @DBVersionPrev = '1.3'
                             END


                           */ 

                            ";
                
                OpenSQLConn();
                using (SqlCommand SQLComm = new SqlCommand(SQL, SQLConn))
                {
                    SQLComm.ExecuteNonQuery();
                }
                isSchemaChecked = true;
            }
            finally
            {
                if (impersonator != null)
                {
                    impersonator.Undo();
                }
                CloseSQLConn();
            }
        }

        public string SaveFavorite(string path)
        {
            string IID = GetItemID(path);
            Impersonator impersonator = null;
            try
            {
                impersonator = tryImpersonate();
                string SQL = @" DECLARE @UID uniqueidentifier
                            
                            SELECT @UID = (SELECT UserID FROM Users WHERE (UserName = @UserName OR UserName = @DomainUser))
                            IF NOT EXISTS (SELECT * FROM ForerunnerFavorites WHERE UserID = @UID AND ItemID = @IID)
                            BEGIN
	                            INSERT ForerunnerFavorites (ItemID, UserID) SELECT @IID,@UID
                            END";

                OpenSQLConn();
                using (SqlCommand SQLComm = new SqlCommand(SQL, SQLConn))
                {
                    SetUserNameParameters(SQLComm);
                    //SQLComm.Parameters.AddWithValue("@Path", HttpUtility.UrlDecode(path));
                    SQLComm.Parameters.AddWithValue("@IID", IID);
                    SQLComm.ExecuteNonQuery();
                }

                //Need to try catch and return error
                JsonWriter w = new JsonTextWriter();
                w.WriteStartObject();
                w.WriteMember("Status");
                w.WriteString("Success");
                w.WriteEndObject();
                return w.ToString();
            }
            finally
            {
                if (impersonator != null)
                {
                    impersonator.Undo();
                }
                CloseSQLConn();
            }
        }

        public string SaveUserParamaters(string path, string parameters)
        {
            path = HttpUtility.UrlDecode(path);
            string IID = GetItemID(path);
            Impersonator impersonator = null;
            try
            {
                impersonator = tryImpersonate();
                string SQL = @" DECLARE @UID uniqueidentifier
                            SELECT @UID = (SELECT UserID FROM Users WHERE (UserName = @UserName OR UserName = @DomainUser))
                            IF NOT EXISTS (SELECT * FROM ForerunnerUserItemProperties WHERE UserID = @UID AND ItemID = @IID)
	                            INSERT ForerunnerUserItemProperties (ItemID, UserID,SavedParameters) SELECT @IID,@UID,@Params 
                            ELSE
                                UPDATE ForerunnerUserItemProperties SET SavedParameters = @Params WHERE UserID = @UID AND ItemID = @IID
                            ";
                OpenSQLConn();
                using (SqlCommand SQLComm = new SqlCommand(SQL, SQLConn))
                {
                    SetUserNameParameters(SQLComm);
                    //SQLComm.Parameters.AddWithValue("@Path", HttpUtility.UrlDecode(path));
                    SQLComm.Parameters.AddWithValue("@Params", parameters);
                    SQLComm.Parameters.AddWithValue("@IID", IID);
                    SQLComm.ExecuteNonQuery();
                }

                //Need to try catch and return error
                JsonWriter w = new JsonTextWriter();
                w.WriteStartObject();
                w.WriteMember("Status");
                w.WriteString("Success");
                w.WriteEndObject();
                return w.ToString();
            }
            finally
            {
                if (impersonator != null)
                {
                    impersonator.Undo();
                }
                CloseSQLConn();
            }
        }

        public string GetUserParameters(string path)
        {
            path = HttpUtility.UrlDecode(path);
            string IID = GetItemID(path);
            Impersonator impersonator = null;
            try
            {
                string savedParams = String.Empty;
                impersonator = tryImpersonate();
                string SQL = @" DECLARE @UID uniqueidentifier
                                SELECT @UID = (SELECT UserID FROM Users WHERE (UserName = @UserName OR UserName = @DomainUser))
                                SELECT SavedParameters, UserID FROM ForerunnerUserItemProperties WHERE (UserID = @UID OR UserID IS NULL) AND ItemID = @IID";

                OpenSQLConn();
                using (SqlCommand SQLComm = new SqlCommand(SQL, SQLConn))
                {
                    SetUserNameParameters(SQLComm);
                    //SQLComm.Parameters.AddWithValue("@Path", HttpUtility.UrlDecode(path));
                    SQLComm.Parameters.AddWithValue("@IID", IID);

                    using (SqlDataReader SQLReader = SQLComm.ExecuteReader())
                    {
                        while (SQLReader.Read())
                        {
                            savedParams = SQLReader.GetString(0);
                        }
                    }
                    return savedParams;
                }
            }
            finally
            {
                if (impersonator != null)
                {
                    impersonator.Undo();
                }
                CloseSQLConn();
            }
        }
        public string SaveUserSettings(string settings)
        {
            Impersonator impersonator = null;
            try
            {
                impersonator = tryImpersonate();
                string SQL = @" DECLARE @UID uniqueidentifier
                            SELECT @UID = (SELECT UserID FROM Users WHERE (UserName = @UserName OR UserName = @DomainUser))
                            IF NOT EXISTS (SELECT * FROM ForerunnerUserSettings WHERE UserID = @UID)
	                            INSERT ForerunnerUserSettings (UserID, Settings) SELECT @UID, @Params
                            ELSE
                                UPDATE ForerunnerUserSettings SET Settings = @Params WHERE UserID = @UID
                            ";
                
                OpenSQLConn();
                using (SqlCommand SQLComm = new SqlCommand(SQL, SQLConn))
                {
                    SetUserNameParameters(SQLComm);
                    SQLComm.Parameters.AddWithValue("@Params", settings);
                    SQLComm.ExecuteNonQuery();
                }

                //Need to try catch and return error
                JsonWriter w = new JsonTextWriter();
                w.WriteStartObject();
                w.WriteMember("Status");
                w.WriteString("Success");
                w.WriteEndObject();
                return w.ToString();
            }
            finally
            {
                if (impersonator != null)
                {
                    impersonator.Undo();
                }
                CloseSQLConn();
            }
        }

        public string GetUserSettings()
        {
            Impersonator impersonator = null;
            try
            {
                impersonator = tryImpersonate();
                string settings;
                string SQL = @" DECLARE @UID uniqueidentifier
                                SELECT @UID = (SELECT UserID FROM Users WHERE (UserName = @UserName OR UserName = @DomainUser))
                                SELECT Settings FROM ForerunnerUserSettings WHERE UserID = @UID";
                OpenSQLConn();
                using (SqlCommand SQLComm = new SqlCommand(SQL, SQLConn))
                {
                    SetUserNameParameters(SQLComm);
                    using (SqlDataReader SQLReader = SQLComm.ExecuteReader())
                    {
                        settings = string.Empty;

                        while (SQLReader.Read())
                        {
                            settings = SQLReader.GetString(0);
                        }
                    }
                }

                //Need to try catch and return error
                return settings == "" ? "{}" : settings;
            }
            finally
            {
                if (impersonator != null)
                {
                    impersonator.Undo();
                }
                CloseSQLConn();
            }
        }
        private string GetItemID(string path)
        {            
            Property[] props = new Property[1];
            Property retrieveProp = new Property();
            retrieveProp.Name = "ID";
            props[0] = retrieveProp;

            Property[] properties = callGetProperties(path, props);

            return properties[0].Value;

        }
        public string IsFavorite(string path)
        {
            string IID = GetItemID(path);
            Impersonator impersonator = null;
            try
            {
                impersonator = tryImpersonate();
                string SQL = @" DECLARE @UID uniqueidentifier
                                SELECT @UID = (SELECT UserID FROM Users WHERE (UserName = @UserName OR UserName = @DomainUser))
                                SELECT * FROM ForerunnerFavorites WHERE UserID = @UID AND ItemID = @IID";
                bool isFav;
                
                OpenSQLConn();
                using (SqlCommand SQLComm = new SqlCommand(SQL, SQLConn))
                {
                    SetUserNameParameters(SQLComm);
                    //SQLComm.Parameters.AddWithValue("@Path", HttpUtility.UrlDecode(path));
                    SQLComm.Parameters.AddWithValue("@IID", IID);
                    using (SqlDataReader SQLReader = SQLComm.ExecuteReader())
                    {
                        isFav = SQLReader.HasRows;
                    }
                }

                //Need to try catch and return error
                JsonWriter w = new JsonTextWriter();
                w.WriteStartObject();
                w.WriteMember("IsFavorite");
                w.WriteBoolean(isFav);
                w.WriteEndObject();
                return w.ToString();
            }
            finally
            {
                if (impersonator != null)
                {
                    impersonator.Undo();
                }
                CloseSQLConn();
            }
        }

        private string GetPath(string path)
        {
            
            if (IsNativeRS)
                return path;

            return SharePointHostName + path.Substring(39);            

        }
        public CatalogItem[] GetFavorites()
        {
            Impersonator impersonator = null;
            try
            {
                impersonator = tryImpersonate();
                List<CatalogItem> list = new List<CatalogItem>();
                CatalogItem c;

                string SQL = @"DECLARE @UID uniqueidentifier
                               SELECT @UID = (SELECT UserID FROM Users WHERE (UserName = @UserName OR UserName = @DomainUser))
                               SELECT DISTINCT Path,Name,ModifiedDate,c.ItemID FROM ForerunnerFavorites f INNER JOIN Catalog c ON f.ItemID = c.ItemID WHERE f.UserID = @UID";
                
                OpenSQLConn();
                using (SqlCommand SQLComm = new SqlCommand(SQL, SQLConn))
                {

                    SetUserNameParameters(SQLComm);
                    using (SqlDataReader SQLReader = SQLComm.ExecuteReader())
                    {
                        while (SQLReader.Read())
                        {
                            c = new CatalogItem();
                            c.Path = GetPath(SQLReader.GetString(0));
                            c.Name = SQLReader.GetString(1);
                            c.ModifiedDate = SQLReader.GetDateTime(2);
                            c.ModifiedDateSpecified = true;
                            c.Type = ItemTypeEnum.Report;
                            c.ID = SQLReader.GetGuid(3).ToString();
                            list.Add(c);
                        }
                    }
                }

                return list.ToArray();
            }
            finally
            {
                if (impersonator != null)
                {
                    impersonator.Undo();
                }
                CloseSQLConn();
            }
        }

        public CatalogItem[] GetRecentReports()
        {
            Impersonator impersonator = null;
            try
            {
                impersonator = tryImpersonate();
                List<CatalogItem> list = new List<CatalogItem>();
                CatalogItem c;

                string SQL = @"SELECT Path,Name,ModifiedDate,ItemID  
                            FROM Catalog c INNER JOIN (
                            SELECT ReportID,max(TimeStart) TimeStart
                            FROM ExecutionLogStorage 
                            WHERE  (UserName like '%\'+ @UserName OR UserName = @DomainUser) AND ReportAction = 1 AND format IS NOT NULL AND format <> 'MHTML' AND TimeStart > DATEADD(dd,-60,GETDATE()) 
                            GROUP BY ReportID
                            ) e
                            ON e.ReportID = c.ItemID 
                            ORDER BY TimeStart DESC";

                OpenSQLConn();
                using (SqlCommand SQLComm = new SqlCommand(SQL, SQLConn))
                {

                    SetUserNameParameters(SQLComm);

                    using (SqlDataReader SQLReader = SQLComm.ExecuteReader())
                    {

                        while (SQLReader.Read())
                        {
                            c = new CatalogItem();
                            c.Path = GetPath(SQLReader.GetString(0));
                            c.Name = SQLReader.GetString(1);
                            c.ModifiedDate = SQLReader.GetDateTime(2);
                            c.ModifiedDateSpecified = true;
                            c.Type = ItemTypeEnum.Report;
                            c.ID = SQLReader.GetGuid(3).ToString();
                            list.Add(c);

                        }
                    }
                }
                
                return list.ToArray();
            }
            finally
            {
                if (impersonator != null)
                {
                    impersonator.Undo();
                }
                CloseSQLConn();
            }
        }

        public string DeleteFavorite(string path)
        {
            string IID = GetItemID(path);
            Impersonator impersonator = null;
            try
            {
                impersonator = tryImpersonate();
                string SQL = @" DECLARE @UID uniqueidentifier
                                SELECT @UID = (SELECT UserID FROM Users WHERE (UserName = @UserName OR UserName = @DomainUser))
                                DELETE ForerunnerFavorites WHERE ItemID = @IID AND UserID =  @UID";
                
                OpenSQLConn();
                using (SqlCommand SQLComm = new SqlCommand(SQL, SQLConn))
                {
                    SetUserNameParameters(SQLComm);
                    //SQLComm.Parameters.AddWithValue("@Path", HttpUtility.UrlDecode(path));
                    SQLComm.Parameters.AddWithValue("@IID", IID);

                    SQLComm.ExecuteNonQuery();
                }
                //Need to try catch and return error
                JsonWriter w = new JsonTextWriter();
                w.WriteStartObject();
                w.WriteMember("Status");
                w.WriteString("Success");
                w.WriteEndObject();
                return w.ToString();
            }
            finally
            {
                if (impersonator != null)
                {
                    impersonator.Undo();
                }
                CloseSQLConn();
            }
        }

        private void SetUserNameParameters(SqlCommand SQLComm, string domainUserNameFromCaller = null)
        {
            string domainUserName = domainUserNameFromCaller == null ? HttpContext.Current.User.Identity.Name : domainUserNameFromCaller;

                       
            string[] stringTokens = domainUserName.Split('\\');
            string uName = stringTokens[stringTokens.Length - 1];

            if (stringTokens.Length == 1)
                domainUserName = DefaultUserDomain + "\\" + uName;

            SQLComm.Parameters.AddWithValue("@UserName", uName);
            SQLComm.Parameters.AddWithValue("@DomainUser", domainUserName);
        }

        private int IsUserSpecific(string path)
        {
            Property[] props = new Property[2];
            Property retrieveProp = new Property();
            retrieveProp.Name = "HasUserProfileQueryDependencies";
            props[0] = retrieveProp;
            retrieveProp = new Property();
            retrieveProp.Name = "HasUserProfileReportDependencies";
            props[1] = retrieveProp;
            int IsUserSpecific = 1;  //Boolean not working in SQL very well so used int

            Property[] properties = callGetProperties(path, props);

            if (properties.Length == 2 && properties[0].Value.ToLower() == "false" && properties[0].Value.ToLower() == "false")
                IsUserSpecific = 0;

            return IsUserSpecific;
        }
        private void SaveImage(byte[] image, string path, string userName, string IID, int IsUserSpecific)
        {   
            string SQL = @" BEGIN TRAN t1
                            DECLARE @UID uniqueidentifier
                                                                                        
                            IF (@UserSpecific = 1)
                                BEGIN
                                    SELECT @UID = (SELECT UserID FROM Users WHERE (UserName = @UserName OR UserName = @DomainUser))
                                    DELETE ForerunnerCatalog WHERE UserID = @UID AND ItemID = @IID
                                END
                            ELSE
                                BEGIN
                                    SELECT @UID = NULL
                                    DELETE ForerunnerCatalog WHERE UserID IS NULL AND ItemID = @IID
                                END
                            INSERT ForerunnerCatalog (ItemID, UserID,ThumbnailImage,SaveDate) SELECT @IID,@UID,@Image, GETDATE()                            
                            IF @@error <> 0
                                ROLLBACK TRAN t1
                            ELSE
                                COMMIT TRAN t1        
                            ";
            try
            {
                OpenSQLConn();
                using (SqlCommand SQLComm = new SqlCommand(SQL, SQLConn))
                {
                    SetUserNameParameters(SQLComm, userName);

                    SQLComm.Parameters.AddWithValue("@UserSpecific", IsUserSpecific);
                    SQLComm.Parameters.AddWithValue("@Path", HttpUtility.UrlDecode(path));
                    SQLComm.Parameters.AddWithValue("@Image", image);
                    SQLComm.Parameters.AddWithValue("@IID", IID);
                    SQLComm.ExecuteNonQuery();
                }
            }
            finally
            {
                CloseSQLConn();
            }
        }
        public byte[] GetDBImage(string path)
        {
            string IID = GetItemID(path);

            Impersonator impersonator = null;
            try
            {
                impersonator = tryImpersonate();
                byte[] retval = null;
                string SQL = @"DECLARE @UID uniqueidentifier
                               SELECT @UID = (SELECT UserID FROM Users WHERE (UserName = @UserName OR UserName = @DomainUser))
                               SELECT ThumbnailImage FROM ForerunnerCatalog f INNER JOIN Catalog c ON c.ItemID = f.ItemID WHERE (f.UserID IS NULL OR f.UserID = @UID) AND c.ItemID = @IID AND c.ModifiedDate <= f.SaveDate";

                OpenSQLConn();
                using (SqlCommand SQLComm = new SqlCommand(SQL, SQLConn))
                {
                    //SQLComm.Prepare();
                    SQLComm.Parameters.AddWithValue("@Path", HttpUtility.UrlDecode(path));
                    SQLComm.Parameters.AddWithValue("@IID", IID);
                    SetUserNameParameters(SQLComm);
                    using (SqlDataReader SQLReader = SQLComm.ExecuteReader())
                    {
                        if (SQLReader.HasRows)
                        {
                            SQLReader.Read();
                            retval = SQLReader.GetSqlBytes(0).Buffer;
                        }
                    }
                }
                return retval;
            }
            finally
            {
                if (impersonator != null)
                {
                    impersonator.Undo();
                }
                CloseSQLConn();
            }
        }

        public bool HasPermission(string path, string requiredPermission)
        {
            bool hasPermission = false;
            foreach (string permission in callGetPermissions(path))
            {
                if (permission.IndexOf(requiredPermission, StringComparison.OrdinalIgnoreCase) != -1)
                {
                    hasPermission = true;
                    break;
                }
            }

            return hasPermission;
        }

        public byte[] GetCatalogImage(string path)
        {
            bool hasPermission = HasPermission(path, "Execute");
            if (hasPermission)
            {
                byte[] retval = null;
                retval = GetDBImage(path);
                ThreadContext context = null;
                Impersonator sqlImpersonator = null;
                bool isException = false;
                try
                {
                    if (retval == null)
                    {

                        sqlImpersonator = tryImpersonate(true);
                        context = new ThreadContext(HttpUtility.UrlDecode(path), sqlImpersonator, !GetServerRendering());
                        this.SetCredentials(context.NetworkCredential);
                        ThreadPool.QueueUserWorkItem(this.GetThumbnail, context);
                        //Thread t = new Thread(new ParameterizedThreadStart(this.GetThumbnail));                
                        //t.Start(path);
                        //t.Join();                    
                    }
                }
                catch
                {
                    isException = true;
                }
                finally
                {
                    if (isException)
                    {
                        if (context.SecondImpersonator != null)
                        {
                            context.SecondImpersonator.Dispose();
                        }
                        if (context != null)
                        {
                            context.Dispose();
                        }
                        if (sqlImpersonator != null)
                        {
                            sqlImpersonator.Dispose();
                        }
                    }
                }
                return retval;
            }

            return null;
        }

        private bool GetServerRendering()
        {
            ReportViewer rep = new ReportViewer(this.URL);
            return rep.GetServerRendering();
        }

        public void GetThumbnail(object context)
        {
            ThreadContext threadContext = (ThreadContext)context;
            String path = threadContext.Path;
            String userName = threadContext.UserName != null ? threadContext.UserName : threadContext.NetworkCredential.UserName;
            byte[] retval = null;
            int isUserSpecific = 0;
            bool isException = false;
            string IID = null;
            Impersonator sqlImpersonator = threadContext.SqlImpersonator;
            try
            {
                threadContext.Impersonate();
                IID = GetItemID(path);
                ReportViewer rep = new ReportViewer(this.URL);
                rep.SetImpersonator(threadContext.SecondImpersonator);
                if (Forerunner.Security.AuthenticationMode.GetAuthenticationMode() == System.Web.Configuration.AuthenticationMode.Forms)
                {
                    rep.SetCredentials(threadContext.NetworkCredential);
                }
                retval = rep.GetThumbnail(path, "", "1", 1.2);
                isUserSpecific = IsUserSpecific(path);
            }
            catch
            {
                isException = true;
            }
            finally
            {
                if (isException)
                {
                    if (sqlImpersonator != null)
                    {
                        sqlImpersonator.Dispose();
                    }
                    if (threadContext.SecondImpersonator != null)
                    {
                        threadContext.SecondImpersonator.Dispose();
                    }
                }
                threadContext.Undo();
                threadContext.Dispose();
            }
            if (retval != null)
            {
                
                try
                {
                    if (sqlImpersonator != null)
                    { 
                        sqlImpersonator.Impersonate(); 
                    }
                    SaveImage(retval, path.ToString(), userName, IID, isUserSpecific);
                }
                finally
                {
                    if (sqlImpersonator != null)
                    {
                        sqlImpersonator.Dispose();
                    }
                }
            }
        }

        protected virtual void Dispose(bool disposing)
        {
            if (disposing)
            {
                rs.Dispose();
                if (SQLConn.State == System.Data.ConnectionState.Open)
                    SQLConn.Close();
                SQLConn.Dispose();
                if (impersonator != null)
                {
                    impersonator.Undo();
                }
            }
        }

        public void Dispose()
        {
            Dispose(true);
            GC.SuppressFinalize(this);
        }
    }
}
