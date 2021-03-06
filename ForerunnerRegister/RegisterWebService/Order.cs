﻿using System;
using System.Collections.Generic;
using System.Configuration;
using System.Linq;
using System.Web;
using System.Xml;
using System.Data.SqlClient;
using ForerunnerRegister;

namespace ForerunnerWebService
{
    public class Order
    {
        private static string LicenseMailSubject = ConfigurationManager.AppSettings["LicenseMailSubject"];
        private static string LicenseMailBody = ConfigurationManager.AppSettings["LicenseMailBody"];
        private static string LicenseMailFromAccount = ConfigurationManager.AppSettings["LicenseMailFromAccount"];


        public void AddWorkerNewShopifyOrder(string XMLOrder,string HostName = "")
        {

            (new TaskWorker()).SaveTask("NewShopifyOrder", XMLOrder, HostName);
            
        }

        public string ProcessShopifyOrder(XmlReader XMLOrder)
        {

            string Email = null;
            string GroupID = null;
            string SKU = null;
            string OrderNumber = null;
            string ProductName = null;
            int Quantity = 0;
            TaskWorker Task = new TaskWorker();
            string LastNode = "";

            XMLOrder.Read();
            if (XMLOrder.Name != "order")
                return "Not an Order";
            XMLOrder.Read();

            while (!XMLOrder.EOF)
            {
                LastNode = XMLOrder.Name;
                switch (XMLOrder.Name)
                {                   
                    case "email":
                        Email = XMLOrder.ReadElementContentAsString();
                        break;
                    case "order-number":
                        OrderNumber = XMLOrder.ReadElementContentAsString();
                        break;
                    default:
                        //skip empty 
                        if (XMLOrder.IsEmptyElement)
                        {
                            XMLOrder.Read();
                            break;
                        }
                        //Skip all other elements
                        while ((XMLOrder.Name == LastNode && XMLOrder.NodeType == XmlNodeType.EndElement) != true)
                            XMLOrder.Read();
                        XMLOrder.Read();                        
                        break;
                  case "line-items":
                        XMLOrder.Read();                        
                        while (!XMLOrder.EOF)
                        {
                            if (XMLOrder.Name != "line-item")
                                break;                        
                            SKU = null;
                            Quantity = 0;
                            while (!XMLOrder.EOF)
                            {
                                switch (XMLOrder.Name)
                                {
                                    case "quantity":
                                        Quantity = XMLOrder.ReadElementContentAsInt();
                                        break;
                                    case "sku":
                                        SKU = XMLOrder.ReadElementContentAsString();
                                        break;
                                    case "name":
                                        ProductName = XMLOrder.ReadElementContentAsString();
                                        break;
                                }
                                if (XMLOrder.NodeType == XmlNodeType.EndElement && XMLOrder.Name == "line-item")
                                {                             
                                    if (Quantity != 0 && Email != null && SKU != null)
                                    {                                        
                                        GroupID = Guid.NewGuid().ToString();
                                        WriteLicense(GroupID, SKU,ProductName, Quantity);
                                        if (SKU.IndexOf("Dev") == -1 && SKU.IndexOf("Test") == -1)
                                        {
                                            WriteLicense(GroupID, SKU + "-Dev", ProductName, Quantity);
                                            WriteLicense(GroupID, SKU + "-Test", ProductName, Quantity);
                                        }
                                        Task.SaveTask("SendLicenseEmail", "<LicenseMail><OrderNumber>" + OrderNumber + "</OrderNumber><Email>" + Email + "</Email><GroupID>" + GroupID + "</GroupID></LicenseMail>");
                                        break;
                                    }
                                    else
                                        return "Invalid Order";
                                }
                                while (!XMLOrder.IsEmptyElement && XMLOrder.NodeType != XmlNodeType.EndElement)
                                {
                                    XMLOrder.Read();
                                }
                                XMLOrder.Read();

                            }
                            while (!XMLOrder.IsEmptyElement && XMLOrder.NodeType != XmlNodeType.EndElement)
                            {
                                XMLOrder.Read();
                            }
                            XMLOrder.Read();
                        }
                        break;
                   
                }
            }


            
            return "success";
        }

        internal void WriteLicense(string GroupID,string SKU, string ProductName,int Quantity,string LicenseID = null,string SplitKey = "",DateTime CreateDate = new DateTime())
        {
            string SQL = @"IF NOT EXISTS (SELECT * FROM License WHERE LicenseID = @LicenseID)
                            INSERT License (LicenseID,LicenseGroupID, SKU,ProductName,Quantity,LastActivateDate,ActivationAttempts,CreateDate,SplitKey)
                            SELECT @LicenseID, @GroupID,@SKU,@ProductName,@Quantity,NULL,0,@CreateDate,@SplitKey";

            ForerunnerDB DB = new ForerunnerDB();
            string ID;
            if (CreateDate == DateTime.MinValue)
                CreateDate = DateTime.Now;

            if (LicenseID == null)
                ID = ForerunnerDB.NewLicenseID();
            else
                ID = LicenseID;

            SqlConnection SQLConn = DB.GetSQLConn();
            SqlCommand SQLComm = new SqlCommand(SQL, SQLConn);
            SQLConn.Open();
            try
            {
                SQLComm = new SqlCommand(SQL, SQLConn);
                SQLComm.Parameters.AddWithValue("@LicenseID", ID);
                SQLComm.Parameters.AddWithValue("@GroupID", GroupID);
                SQLComm.Parameters.AddWithValue("@SKU", SKU);
                SQLComm.Parameters.AddWithValue("@ProductName", ProductName);
                SQLComm.Parameters.AddWithValue("@Quantity", Quantity);
                SQLComm.Parameters.AddWithValue("@SplitKey", SplitKey);
                SQLComm.Parameters.AddWithValue("@CreateDate", CreateDate);
                SQLComm.ExecuteNonQuery();
            }
            catch (Exception e)
            {
                SQLConn.Close();
                throw (e);
            }
            SQLConn.Close();            
        }

        public string SendLicenseMail(XmlReader LicenseXML,TaskWorker tw)
        {
           string Email = null;
            string LicensesText = "";
            string GroupID = null;
            string OrderNumber = null;

            LicenseXML.Read();
            if (LicenseXML.Name != "LicenseMail")
                return "Not an License Mail";
            

            LicenseXML.Read();
            while (!LicenseXML.EOF)
            {
                switch (LicenseXML.Name)
                {
                    case "Email":
                        Email = LicenseXML.ReadElementContentAsString();
                        break;
                    case "GroupID":
                        GroupID = LicenseXML.ReadElementContentAsString();
                        break;
                    case "OrderNumber":
                        OrderNumber = LicenseXML.ReadElementContentAsString();
                        break;
                    default:
                        LicenseXML.Read();
                        break;
                }
            }

            //Get the License data from the License Table
            ForerunnerDB DB = new ForerunnerDB();
            SqlConnection SQLConn = DB.GetSQLConn();
            SqlDataReader SQLReader;

            string SQL = @"SELECT LicenseID, SKU,ProductName,Quantity FROM License WHERE LicenseGroupID = @GroupID";
                            
            SQLConn.Open();
            SqlCommand SQLComm = new SqlCommand(SQL, SQLConn);
            SQLComm.Parameters.AddWithValue("@GroupID", GroupID);

            SQLReader = SQLComm.ExecuteReader();            
            while (SQLReader.Read())
            {
                LicensesText += "Product: <b>";
                LicensesText += SQLReader.GetString(2);
                LicensesText += "</b><br/> SKU: <b>";
                LicensesText += SQLReader.GetString(1);
                LicensesText += "</b><br/> Quantity: <b>";
                LicensesText += SQLReader.GetInt32(3).ToString();
                LicensesText += "</b><br/> License Key: <b>";
                LicensesText += SQLReader.GetString(0);
                LicensesText += "</b><br/>";
                LicensesText += "</b><br/>";
            }
            SQLReader.Close();
            SQLConn.Close();

            string NewMailBody = String.Format(LicenseMailBody, LicensesText);
            string NewMailSubject = String.Format(LicenseMailSubject, OrderNumber);

            tw.SendMail(LicenseMailFromAccount, "Archive@forerunnersw.com", NewMailSubject, NewMailBody);
            return tw.SendMail(LicenseMailFromAccount, Email, NewMailSubject, NewMailBody);

        }

       
    }
}