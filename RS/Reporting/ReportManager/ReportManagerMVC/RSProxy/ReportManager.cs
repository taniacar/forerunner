﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Net;
using System.Data.SqlClient;
using Forerunner;
using Forerunner.Viewer;
using Forerunner.Security;
using Jayrock.Json;

namespace Forerunner.Manager
{

    /// <summary>
    /// This is the proxy class that would call RS to get the data
    /// </summary>
    public class ReportManager
    {
        ReportingService2005 rs = new ReportingService2005();
        SqlConnection SQLConn = new SqlConnection();
        Credentials WSCredentials;
        Credentials DBCredentials;
        Impersonator impersonator; 
        string URL;

        public ReportManager(string URL, Credentials WSCredentials, string ReportServerDataSource, string ReportServerDB, Credentials DBCredentials, bool useIntegratedSecurity)
        {
            this.WSCredentials = WSCredentials;
            this.DBCredentials = DBCredentials;
            rs.Url =  URL + "/ReportService2005.asmx";
            
            
            this.URL = URL;
            
            rs.Credentials = new NetworkCredential(WSCredentials.UserName, WSCredentials.Password, WSCredentials.Domain);
            SqlConnectionStringBuilder builder = new SqlConnectionStringBuilder();
            builder.DataSource = ReportServerDataSource;
            builder.InitialCatalog = ReportServerDB;
            if (useIntegratedSecurity)
            {
                impersonator = new Impersonator(DBCredentials.UserName, DBCredentials.Domain, DBCredentials.Password);
                impersonator.Impersonate();
                builder.IntegratedSecurity = true;
            }
            else
            {
                builder.UserID = DBCredentials.UserName;
                builder.Password = DBCredentials.Password;
            }

            
            SQLConn.ConnectionString = builder.ConnectionString;            
            CheckSchema();
        }      

        public void SetCredentials(Credentials Credentials)
        {
            rs.Credentials = new NetworkCredential(Credentials.UserName, Credentials.Password, Credentials.Domain);
        }

        public CatalogItem[] ListChildren(string path, Boolean isRecursive)
        {
            List<CatalogItem> list = new List<CatalogItem>();
            CatalogItem[] items = rs.ListChildren(path, isRecursive);            

            foreach (CatalogItem ci in items)
            {
                if (ci.Type == ItemTypeEnum.Report|| ci.Type == ItemTypeEnum.LinkedReport)
                    list.Add(ci);
                if (ci.Type == ItemTypeEnum.Folder)
                {                    
                    CatalogItem[] folder = rs.ListChildren(ci.Path,false);
                    foreach (CatalogItem fci in folder)
                    {
                        if (fci.Type == ItemTypeEnum.Report || fci.Type == ItemTypeEnum.LinkedReport || fci.Type == ItemTypeEnum.Folder)
                        {
                            list.Add(ci);
                            break;
                        }
                    }
                }
            }
            return list.ToArray();
        }
    
        void CheckSchema()
        {

            //This should move to the install program
            string SQL = @"IF NOT EXISTS(SELECT * FROM sysobjects WHERE type = 'u' AND name = 'ForerunnerCatalog')
                            BEGIN	                            
	                            CREATE TABLE ForerunnerCatalog (ItemID uniqueidentifier NOT NULL UNIQUE ,UserID uniqueidentifier NOT NULL,ThumbnailImage image NOT NULL, SaveDate datetime NOT NULL,PRIMARY KEY (ItemID,UserID))
                                CREATE TABLE ForerunnerFavorites(ItemID uniqueidentifier NOT NULL UNIQUE ,UserID uniqueidentifier NOT NULL,PRIMARY KEY (ItemID,UserID))
                            END
                           IF NOT EXISTS(SELECT * FROM sysobjects WHERE type = 'u' AND name = 'ForerunnerFavorites')
                            BEGIN	                            	                            
                                CREATE TABLE ForerunnerFavorites(ItemID uniqueidentifier NOT NULL UNIQUE ,UserID uniqueidentifier NOT NULL,PRIMARY KEY (ItemID,UserID))
                            END";
            SQLConn.Open();
            SqlCommand SQLComm = new SqlCommand(SQL, SQLConn);
            SQLComm.ExecuteNonQuery();
            SQLConn.Close();

        }

        public string SaveFavorite(string path)
        {
            string SQL = @" DECLARE @UID uniqueidentifier
                            DECLARE @IID uniqueidentifier
                            SELECT @UID = (SELECT UserID FROM Users WHERE (UserName = @UserName OR UserName = @DomainUser))
                            SELECT @IID = (SELECT ItemID FROM Catalog WHERE Path = @Path  )
                            IF NOT EXISTS (SELECT * FROM ForerunnerFavorites WHERE UserID = @UID AND ItemID = @IID)
                            BEGIN
	                            INSERT ForerunnerFavorites (ItemID, UserID) SELECT @IID,@UID
                            END";
            SQLConn.Open();
            SqlCommand SQLComm = new SqlCommand(SQL, SQLConn);

            SQLComm.Parameters.AddWithValue("@UserName", WSCredentials.UserName);
            SQLComm.Parameters.AddWithValue("@DomainUser", WSCredentials.GetDomainUser());
            SQLComm.Parameters.AddWithValue("@Path", path);
            SQLComm.ExecuteNonQuery();
            SQLConn.Close();

            //Need to try catch and return error
            JsonWriter w = new JsonTextWriter();
            w.WriteStartObject();
            w.WriteMember("Status");
            w.WriteString("Success");
            w.WriteEndObject();
            return w.ToString();

        }

        public string IsFavorite(string path)
        {
            string SQL = @" DECLARE @UID uniqueidentifier
                            DECLARE @IID uniqueidentifier
                            SELECT @UID = (SELECT UserID FROM Users WHERE (UserName = @UserName OR UserName = @DomainUser))
                            SELECT @IID = (SELECT ItemID FROM Catalog WHERE Path = @Path  )
                            SELECT * FROM ForerunnerFavorites WHERE UserID = @UID AND ItemID = @IID";
            SQLConn.Open();
            SqlCommand SQLComm = new SqlCommand(SQL, SQLConn);

            SQLComm.Parameters.AddWithValue("@UserName", WSCredentials.UserName);
            SQLComm.Parameters.AddWithValue("@DomainUser", WSCredentials.GetDomainUser());
            SQLComm.Parameters.AddWithValue("@Path", path);
            SqlDataReader SQLReader;
            SQLReader = SQLComm.ExecuteReader();
            bool isFav = SQLReader.HasRows;
            SQLReader.Close();
            SQLConn.Close();

            //Need to try catch and return error
            JsonWriter w = new JsonTextWriter();
            w.WriteStartObject();
            w.WriteMember("IsFavorite");
            w.WriteBoolean(isFav);
            w.WriteEndObject();
            return w.ToString();

        }

        public CatalogItem[] GetFavorites()
        {
            List<CatalogItem> list = new List<CatalogItem>();
            CatalogItem c;

            string SQL = @"DECLARE @UID uniqueidentifier
                           SELECT @UID = (SELECT UserID FROM Users WHERE (UserName = @UserName OR UserName = @DomainUser))
                           SELECT DISTINCT Path,Name FROM ForerunnerFavorites f INNER JOIN Catalog c ON f.ItemID = c.ItemID WHERE f.UserID = @UID";
            SQLConn.Open();
            SqlCommand SQLComm = new SqlCommand(SQL, SQLConn);
            SQLComm.Parameters.AddWithValue("@UserName", WSCredentials.UserName);
            SQLComm.Parameters.AddWithValue("@DomainUser", WSCredentials.GetDomainUser());

            SqlDataReader SQLReader;
            SQLReader = SQLComm.ExecuteReader();

            while (SQLReader.Read())
            {
                c = new CatalogItem();
                c.Path = SQLReader.GetString(0);
                c.Name = SQLReader.GetString(1);
                c.Type = ItemTypeEnum.Report;
                list.Add(c);
            }
            SQLReader.Close();
            SQLConn.Close();
            return list.ToArray();
        }

        public CatalogItem[] GetRecentReports()
        {            
            List<CatalogItem> list = new List<CatalogItem>();
            CatalogItem c;

            string SQL = @"SELECT DISTINCT Path,Name FROM ExecutionLogStorage e INNER JOIN Catalog c ON e.ReportID = c.ItemID WHERE UserName = @DomainUser and ReportAction = 6 and TimeStart > DATEADD(dd,-60,GETDATE())";

            SQLConn.Open();
            SqlCommand SQLComm = new SqlCommand(SQL, SQLConn);
            SQLComm.Parameters.AddWithValue("@DomainUser", WSCredentials.GetDomainUser());

            SqlDataReader SQLReader;
            SQLReader = SQLComm.ExecuteReader();

            while (SQLReader.Read())
            {
                c = new CatalogItem();
                c.Path = SQLReader.GetString(0);
                c.Name = SQLReader.GetString(1);
                c.Type = ItemTypeEnum.Report;
                list.Add(c);
                
            }
            SQLReader.Close();
            SQLConn.Close();
            return list.ToArray();
        }

        public string DeleteFavorite(string path)
        {
            string SQL = @" DECLARE @UID uniqueidentifier
                            DECLARE @IID uniqueidentifier
                            SELECT @UID = (SELECT UserID FROM Users WHERE (UserName = @UserName OR UserName = @DomainUser))
                            SELECT @IID = (SELECT ItemID FROM Catalog WHERE Path = @Path  )
                            DELETE ForerunnerFavorites WHERE ItemID = @IID AND UserID =  @UID";
            SQLConn.Open();
            SqlCommand SQLComm = new SqlCommand(SQL, SQLConn);

            SQLComm.Parameters.AddWithValue("@UserName", WSCredentials.UserName);
            SQLComm.Parameters.AddWithValue("@DomainUser", WSCredentials.GetDomainUser());
            SQLComm.Parameters.AddWithValue("@Path", path);
            SQLComm.ExecuteNonQuery();
            SQLConn.Close();

            //Need to try catch and return error
            JsonWriter w = new JsonTextWriter();
            w.WriteStartObject();
            w.WriteMember("Status");
            w.WriteString("Success");
            w.WriteEndObject();
            return w.ToString();
        }

        public void SaveImage(byte[] image, string path)
        {
            string SQL = @" DECLARE @UID uniqueidentifier
                            DECLARE @IID uniqueidentifier
                            SELECT @UID = (SELECT UserID FROM Users WHERE (UserName = @UserName OR UserName = @DomainUser))
                            SELECT @IID = (SELECT ItemID FROM Catalog WHERE Path = @Path  )
                            IF EXISTS (SELECT * FROM ForerunnerCatalog WHERE UserID = @UID AND ItemID = @IID)
	                            UPDATE ForerunnerCatalog SET ThumbnailImage = @Image, SaveDate = GETDATE() WHERE UserID = @UID AND ItemID = @IID
                            ELSE
	                            INSERT ForerunnerCatalog (ItemID, UserID,ThumbnailImage,SaveDate) SELECT @IID,@UID,@Image, GETDATE()
                            ";
            SQLConn.Open();
            SqlCommand SQLComm = new SqlCommand(SQL, SQLConn);

            SQLComm.Parameters.AddWithValue("@UserName", WSCredentials.UserName);
            SQLComm.Parameters.AddWithValue("@DomainUser", WSCredentials.GetDomainUser());
            SQLComm.Parameters.AddWithValue("@Path", path);
            SQLComm.Parameters.AddWithValue("@Image", image);            
            SQLComm.ExecuteNonQuery();
            SQLConn.Close();

        }
        public byte[] GetDBImage(string path)
        {
            byte[] retval = null;
            string SQL = @"SELECT ThumbnailImage FROM Users u INNER JOIN ForerunnerCatalog f on u.UserID = f.UserID INNER JOIN Catalog c ON c.ItemID = f.ItemID WHERE (UserName = @UserName OR UserName = @DomainUser) AND c.Path = @Path AND c.ModifiedDate <= f.SaveDate";

            SQLConn.Open();
            SqlCommand SQLComm = new SqlCommand(SQL, SQLConn);
            //SQLComm.Prepare();
            SQLComm.Parameters.AddWithValue("@Path", path);
            SQLComm.Parameters.AddWithValue("@UserName", WSCredentials.UserName);
            SQLComm.Parameters.AddWithValue("@DomainUser", WSCredentials.GetDomainUser());

            SqlDataReader SQLReader;
            SQLReader = SQLComm.ExecuteReader();

            if (SQLReader.HasRows)
            {
                SQLReader.Read();
                retval = SQLReader.GetSqlBytes(0).Buffer;
            }
            SQLReader.Close();
            SQLConn.Close();
            return retval;
        }

        public byte[] GetCatalogImage(string path)
        {
            byte[] retval = null;
            retval = GetDBImage(path);
            if (retval == null)
            {
                ReportViewer rep = new ReportViewer(this.URL);
                rep.SetCredentials(this.WSCredentials);
                retval = rep.GetThumbnail(path, "", "1", 0);
                SaveImage(retval, path);
            }
            return retval;

            
        }

    }
}
