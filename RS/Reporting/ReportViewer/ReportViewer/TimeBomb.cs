﻿using System;
using System.IO;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Web;
using System.Web.Security;
using System.Xml.Serialization;
using System.Runtime.Serialization;
using System.Security.Cryptography;
using Microsoft.Win32;

namespace Forerunner.SSRS.Security
{
    [DataContract()]
    internal class TimeBomb
    {
        #region constants

        // Time bomb grace period expressed in days
        private const int trialPeriod = 30;
        private const String software = "SOFTWARE";
        private const String wow6432Node = "Wow6432Node";
        private const String forerunnerKey = "Forerunnersw";
        private const String ssrsBetaKey = "ssrsBeta";
        private const String ssrsKey = "ssrs";
        private const String timeBombName = "setupdata";
        private const String machineHashName = "setupkey";

        internal const String genericRegistyError = "Setup error - time bomb not found or invalid";

        #endregion  // constants

        #region methods

        internal TimeBomb() { }
        internal static TimeBomb Create(DateTime installDate)
        {
            TimeBomb timeBomb = new TimeBomb();
            timeBomb.start = installDate;
            timeBomb.machineId = MachineId.CreateCurrentMachineId();

            return timeBomb;
        }
        internal static TimeBomb Create()
        {
            return TimeBomb.Create(DateTime.Now);
        }
        internal static void Remove()
        {
            RegistryKey softwareKey = Registry.LocalMachine.OpenSubKey(TimeBomb.software, true);
            // Here we will let the Registry Redirection get us to the Wow6432Node see:
            // http://msdn.microsoft.com/en-us/library/windows/desktop/aa384232(v=vs.85).aspx
            RegistryKey forerunnerswKey = softwareKey.OpenSubKey(TimeBomb.forerunnerKey, true);
            if (forerunnerswKey == null)
            {
                RegistryKey wow6432NodeKey = softwareKey.OpenSubKey(TimeBomb.wow6432Node);
                forerunnerswKey = wow6432NodeKey.OpenSubKey(TimeBomb.forerunnerKey, true);
            }


            if (forerunnerswKey != null)
            {
                RegistryKey ssrsBetawKey = forerunnerswKey.OpenSubKey(TimeBomb.ssrsBetaKey, true);
                if (ssrsBetawKey != null)
                {
                    ssrsBetawKey.DeleteSubKey(TimeBomb.ssrsKey, false);

                    ssrsBetawKey.Close();
                    forerunnerswKey.DeleteSubKey(TimeBomb.ssrsBetaKey, false);
                }
            }
        }
        internal Byte[] Serialize()
        {
            MemoryStream stream = new MemoryStream();
            DataContractSerializer serializer = new DataContractSerializer(typeof(TimeBomb));
            serializer.WriteObject(stream, this);

            return stream.ToArray();
        }
        internal void SaveToRegistry()
        {
            byte[] timeBomb = Serialize();

            MD5Cng md5 = new MD5Cng();
            byte[] machineHash = md5.ComputeHash(timeBomb);
            String cryptoHash = Convert.ToBase64String(machineHash.Take(8).ToArray());

            // Encrypt the string into a byte array
            byte[] timeBombProtected = Encryption.Encrypt(timeBomb);

            // Save the time bomb to the registry
            RegistryKey softwareKey = Registry.LocalMachine.OpenSubKey(TimeBomb.software, true);
            //RegistryKey wow6432NodeKey = softwareKey.CreateSubKey(TimeBomb.wow6432Node);
            //RegistryKey forerunnerswKey = wow6432NodeKey.CreateSubKey(TimeBomb.forerunnerKey);
            RegistryKey forerunnerswKey = softwareKey.CreateSubKey(TimeBomb.forerunnerKey);
            RegistryKey ssrsBetaKey = forerunnerswKey.CreateSubKey(TimeBomb.ssrsBetaKey);
            RegistryKey ssrsKey = ssrsBetaKey.CreateSubKey(TimeBomb.ssrsKey);
            ssrsKey.SetValue(TimeBomb.timeBombName, timeBombProtected, RegistryValueKind.Binary);
            ssrsKey.SetValue(TimeBomb.machineHashName, cryptoHash, RegistryValueKind.String);
        }
        internal static TimeBomb LoadFromRegistry()
        {
            // Load the time bomb from the registry
            RegistryKey softwareKey = Registry.LocalMachine.OpenSubKey(TimeBomb.software);
            // Here we will let the Registry Redirection get us to the Wow6432Node see:
            // http://msdn.microsoft.com/en-us/library/windows/desktop/aa384232(v=vs.85).aspx
            RegistryKey forerunnerswKey = softwareKey.OpenSubKey(TimeBomb.forerunnerKey);
            if (forerunnerswKey == null)
            {
                RegistryKey wow6432NodeKey = softwareKey.OpenSubKey(TimeBomb.wow6432Node);
                forerunnerswKey = wow6432NodeKey.OpenSubKey(TimeBomb.forerunnerKey);
                if (forerunnerswKey == null)
                {
                    LicenseException e = new LicenseException(TimeBomb.genericRegistyError);
                    e.Data.Add(LicenseException.failKey, LicenseException.FailReason.TimeBombMissing);
                    throw e;
                }
            }

            RegistryKey ssrBetaKey = forerunnerswKey.OpenSubKey(TimeBomb.ssrsBetaKey);
            if (ssrBetaKey == null)
            {
                LicenseException e = new LicenseException(TimeBomb.genericRegistyError);
                e.Data.Add(LicenseException.failKey, LicenseException.FailReason.TimeBombMissing);
                throw e;
            }

            RegistryKey ssrKey = ssrBetaKey.OpenSubKey(TimeBomb.ssrsKey);
            if (ssrKey == null)
            {
                LicenseException e = new LicenseException(TimeBomb.genericRegistyError);
                e.Data.Add(LicenseException.failKey, LicenseException.FailReason.TimeBombMissing);
                throw e;
            }

            byte[] timeBombProtected = (byte[])ssrKey.GetValue(TimeBomb.timeBombName);

            if (timeBombProtected == null)
            {
                LicenseException e = new LicenseException(TimeBomb.genericRegistyError);
                e.Data.Add(LicenseException.failKey, LicenseException.FailReason.TimeBombMissing);
                throw e;
            }

            // Decrypt the time bomb data
            byte[] timeBombData = Security.Encryption.Decrypt(timeBombProtected);

            // Deserialize the time bomb
            MemoryStream stream = new MemoryStream(timeBombData);
            DataContractSerializer serializer = new DataContractSerializer(typeof(TimeBomb));
            return (TimeBomb)serializer.ReadObject(stream);
        }
        internal static bool PreviouslyInstalled()
        {
            RegistryKey softwareKey = Registry.LocalMachine.OpenSubKey(TimeBomb.software);
            // Here we will let the Registry Redirection get us to the Wow6432Node see:
            // http://msdn.microsoft.com/en-us/library/windows/desktop/aa384232(v=vs.85).aspx
            RegistryKey forerunnerswKey = softwareKey.OpenSubKey(TimeBomb.forerunnerKey);
            if (forerunnerswKey == null)
            {
                RegistryKey wow6432NodeKey = softwareKey.OpenSubKey(TimeBomb.wow6432Node);
                if (wow6432NodeKey == null)
                {
                    // This means we are compiled as 32 bit and cannot open this key.
                    return false;
                }
                forerunnerswKey = wow6432NodeKey.OpenSubKey(TimeBomb.forerunnerKey);
                if (forerunnerswKey == null)
                {
                    return false;
                }
            }

            RegistryKey ssrsBetaKey = forerunnerswKey.OpenSubKey(TimeBomb.ssrsBetaKey);
            if (ssrsBetaKey == null)
            {
                return false;
            }

            return true;
        }
        internal bool IsValid()
        {
            TimeSpan timeSpan = DateTime.Now.Subtract(start);
            if (timeSpan.Days > trialPeriod)
            {
                return false;
            }

            if (timeSpan.Days < 0)
            {
                // This could happen if someone runs install with the system date set to a future
                // date
                return false;
            }

            return true;
        }
        internal bool IsSameMachine(MachineId currentMachineId)
        {
            if (!machineId.IsSame(currentMachineId))
            {
                return false;
            }

            return true;
        }

        #endregion //methods

        #region data

        [DataMember()]
        internal DateTime start;          // Time Bomb Start date / time
        [DataMember()]
        internal MachineId machineId;     // Machine Id where the Time Bomb was created

        #endregion  // data
    }
}
