﻿using System;
using ForerunnerLicense;

namespace ValidateLicense
{
    class Program
    {
        static int Main(string[] args)
        {
            try
            {
                ClientLicense.Validate(true);
                Console.WriteLine("Validation succeeded.");
                return 0;
            }
            catch (Exception e)
            {
                Console.WriteLine("Validation failed.  " + e.ToString());
                return 1;
            }
        }
    }
}