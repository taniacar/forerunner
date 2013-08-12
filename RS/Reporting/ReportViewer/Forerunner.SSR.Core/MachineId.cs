﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Net;
using System.Web;
using System.Xml.Serialization;
using System.Runtime.Serialization.Formatters.Binary;

namespace Forerunner.SSR.Core
{
    [Serializable()]
    [XmlRoot()]
    public class MachineId
    {
        #region methods

        private MachineId()
        {
            motherBoardId = GetBaseBoardId();
            hostName = GetHostName();
            biosId = GetBIOSId();
            macId = GetMacId();
        }
        public static MachineId CreateCurrentMachineId()
        {
            MachineId machineId = new MachineId();
            return machineId;
        }
        public bool IsSame(MachineId machineId)
        {
            int sameCount = 0;
            if (motherBoardId.CompareTo(machineId.motherBoardId) == 0)
            {
                sameCount++;
            }
            if (hostName.CompareTo(machineId.hostName) == 0)
            {
                sameCount++;
            }
            if (biosId.CompareTo(machineId.biosId) == 0)
            {
                sameCount++;
            }
            if (macId.CompareTo(machineId.macId) == 0)
            {
                sameCount++;
            }

            return sameCount >= 2;
        }
        private static String GetHostName()
        {
            return Dns.GetHostName();
        }
        private static string GetBIOSId()
        {
            return identifier("Win32_BIOS", "Manufacturer")
            + identifier("Win32_BIOS", "SMBIOSBIOSVersion")
            + identifier("Win32_BIOS", "IdentificationCode")
            + identifier("Win32_BIOS", "SerialNumber")
            + identifier("Win32_BIOS", "ReleaseDate")
            + identifier("Win32_BIOS", "Version");
        }
        private static string GetBaseBoardId()
        {
            return identifier("Win32_BaseBoard", "Model")
            + identifier("Win32_BaseBoard", "Manufacturer")
            + identifier("Win32_BaseBoard", "Name")
            + identifier("Win32_BaseBoard", "SerialNumber");
        }
        private static string GetMacId()
        {
            return identifier("Win32_NetworkAdapterConfiguration", "MACAddress", "IPEnabled");
        }
        private static string identifier(string wmiClass, string wmiProperty)
        {
            string result = "";
            System.Management.ManagementClass mc = new System.Management.ManagementClass(wmiClass);
            System.Management.ManagementObjectCollection moc = mc.GetInstances();
            foreach (System.Management.ManagementObject mo in moc)
            {
                // First one only
                if (result == "")
                {
                    try
                    {
                        result = mo[wmiProperty].ToString();
                        break;
                    }
                    catch
                    {
                    }
                }
            }
            return result;
        }
        private static string identifier(string wmiClass, string wmiProperty, string wmiMustBeTrue)
        {
            string result = "";
            System.Management.ManagementClass mc = new System.Management.ManagementClass(wmiClass);
            System.Management.ManagementObjectCollection moc = mc.GetInstances();
            foreach (System.Management.ManagementObject mo in moc)
            {
                if (mo[wmiMustBeTrue].ToString() == "True")
                {
                    //Only get the first one
                    if (result == "")
                    {
                        try
                        {
                            result = mo[wmiProperty].ToString();
                            break;
                        }
                        catch
                        {
                        }
                    }
                }
            }
            return result;
        }

        #endregion  // methods

        #region data

        [XmlElement()]
        public String motherBoardId;

        [XmlElement()]
        public String hostName;

        [XmlElement()]
        public String biosId;

        [XmlElement()]
        public String macId;

        #endregion data
    }
}
