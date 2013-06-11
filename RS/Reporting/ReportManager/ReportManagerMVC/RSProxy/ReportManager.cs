﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Net;
using System.Data.SqlClient;
using Forerunner;
using Forerunner.Viewer;
using Forerunner.Security;

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
            //Hack need to fix this for HTTP
            rs.Url = "http://" + URL + "/ReportService2005.asmx";
            this.URL = URL;
            this.WSCredentials = WSCredentials;
            this.DBCredentials = DBCredentials;

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
            SQLConn.Open();
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
            string SQL = @"if not exists(SELECT * FROM sysobjects WHERE type = 'u' and name = 'ForerunnerCatalog')
                            BEGIN	                            
	                            CREATE TABLE ForerunnerCatalog (ItemID uniqueidentifier NOT NULL UNIQUE ,UserID uniqueidentifier NOT NULL,ThumbnailImage image NOT NULL, SaveDate datetime NOT NULL,PRIMARY KEY (ItemID,UserID))
                            END";
            SqlCommand SQLComm = new SqlCommand(SQL, SQLConn);
            SQLComm.ExecuteNonQuery();

        }

        public void SaveImage(byte[] image, string path)
        {
            string SQL = @"BEGIN
                            DECLARE @UID uniqueidentifier
                            DECLARE @IID uniqueidentifier
                            SELECT @UID = (SELECT UserID FROM Users WHERE (UserName = @UserName OR UserName = @DomainUser))
                            SELECT @IID = (SELECT ItemID FROM Catalog WHERE Path = @Path  )
                            IF EXISTS (SELECT * FROM ForerunnerCatalog WHERE UserID = @UID AND ItemID = @IID)
	                            UPDATE ForerunnerCatalog SET ThumbnailImage = @Image, SaveDate = GETDATE() WHERE UserID = @UID AND ItemID = @IID
                            ELSE
	                            INSERT ForerunnerCatalog (ItemID, UserID,ThumbnailImage,SaveDate) SELECT @IID,@UID,@Image, GETDATE()
                            END";
            SqlCommand SQLComm = new SqlCommand(SQL, SQLConn);

            SQLComm.Parameters.AddWithValue("@UserName", WSCredentials.UserName);
            SQLComm.Parameters.AddWithValue("@DomainUser", WSCredentials.GetDomainUser());
            SQLComm.Parameters.AddWithValue("@Path", path);
            SQLComm.Parameters.AddWithValue("@Image", image);            
            SQLComm.ExecuteNonQuery();

        }
        public byte[] GetDBImage(string path)
        {
            byte[] retval = null;
            string SQL = @"SELECT ThumbnailImage FROM Users u INNER JOIN ForerunnerCatalog f on u.UserID = f.UserID INNER JOIN Catalog c ON c.ItemID = f.ItemID WHERE (UserName = @UserName OR UserName = @DomainUser) AND c.Path = @Path AND c.ModifiedDate <= f.SaveDate";
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
