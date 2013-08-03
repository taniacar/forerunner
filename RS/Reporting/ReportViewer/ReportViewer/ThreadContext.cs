﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Security.Principal;
using System.Web;

namespace Forerunner
{
    internal class ThreadContext : IDisposable
    {
        public ThreadContext(String path)
        {
            Path = path;
            duplicateIdentity();
        }
        private void duplicateIdentity() 
        {
            var token = ((WindowsIdentity)HttpContext.Current.User.Identity).Token;
            duplicateToken = new IntPtr(0);
        
            const int SecurityImpersonation = 2;
            if (Security.NativeMethods.DuplicateToken(token, SecurityImpersonation, ref duplicateToken) == false)
            {
                throw new ApplicationException("Failed to impersonate current user");
            }

            identity = new WindowsIdentity(duplicateToken);
        }
        private bool disposed;
        public void Dispose() { Dispose(true); }
        //Dispose(bool) should be declared as protected, virtual, and unsealed
        protected virtual void Dispose(bool isDisposing)
        {
            if (disposed) return;
            if (isDisposing)
            {
                if (identity != null)
                {
                    identity.Dispose();
                }
                if (!duplicateToken.Equals(IntPtr.Zero))
                {
                    Security.NativeMethods.CloseHandle(duplicateToken);
                }
            }
            // -----------------
            disposed = true;
            GC.SuppressFinalize(this);
        }
        ~ThreadContext() { Dispose(false); }
        public String Path;
        private IntPtr duplicateToken;
        private WindowsIdentity identity;
        public WindowsIdentity Identity {
            get { return identity;}
        }
    }
}
